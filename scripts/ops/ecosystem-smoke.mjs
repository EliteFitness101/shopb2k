#!/usr/bin/env node
/**
 * ResoFit ecosystem production smoke checks.
 * Non-mutating HTTP checks only. The cart probe submits an intentionally invalid
 * payload and must fail validation before any cart or payment data is written.
 */
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 15000);
const targets = [
  { name: "canonical-home", url: "https://www.resofit.fit/", kind: "html" },
  { name: "assessment", url: "https://www.resofit.fit/me", kind: "html" },
  { name: "apex-home", url: "https://resofit.fit/", kind: "html" },
  { name: "robots", url: "https://www.resofit.fit/robots.txt", kind: "robots" },
  { name: "sitemap", url: "https://www.resofit.fit/sitemap.xml", kind: "xml" },
  { name: "chatb2k", url: "https://chatb2k.resofit.fit/", kind: "html" },
  { name: "dashboard", url: "https://dashboard.resofit.fit/", kind: "html" },
  { name: "store", url: "https://store.resofit.fit/", kind: "html" },
  { name: "elite", url: "https://elite.resofit.fit/", kind: "html" },
  { name: "martial", url: "https://martial.resofit.fit/", kind: "html" },
  // Canonical Vercel API route: POST {} must reach validation and return 400 before any write.
  { name: "api-cart-validation", url: "https://www.resofit.fit/api/cart", kind: "api-validation", method: "POST", body: {} },
  // Public Supabase catalog API is a separate backend health signal, independent of the Vercel domain/WAF.
  { name: "catalog-public-api", url: "https://vbqjvmnhdtdhmeeudqnn.supabase.co/functions/v1/catalog-public?q=meal&limit=1", kind: "json" },
];

function contentType(response) {
  return (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
}

async function checkTarget(target) {
  const started = Date.now();
  try {
    const headers = { "user-agent": "ResoFit-Ecosystem-Smoke/1.0" };
    if (target.body !== undefined) headers["content-type"] = "application/json";
    const response = await fetch(target.url, {
      method: target.method || "GET",
      body: target.body === undefined ? undefined : JSON.stringify(target.body),
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      headers,
    });
    const type = contentType(response);
    const body = await response.text();
    const elapsedMs = Date.now() - started;
    const cloudflareChallenge = response.status === 403 && (
      response.headers.get("cf-mitigated") === "challenge" ||
      /cloudflare|just a moment|challenge-platform/i.test(body)
    );
    let ok = response.status >= 200 && response.status < 300;
    let reason = ok ? "HTTP 2xx" : `HTTP ${response.status}`;
    if (cloudflareChallenge) {
      ok = false;
      reason = "Cloudflare Managed Challenge blocked the synthetic probe; origin was not reached";
    }

    if (target.kind === "html" && !type.includes("text/html")) {
      ok = false;
      reason = `expected HTML, received ${type || "unknown content type"}`;
    }
    if (target.kind === "xml" && !(type.includes("xml") || body.trimStart().startsWith("<?xml") || body.trimStart().startsWith("<urlset"))) {
      ok = false;
      reason = `expected XML sitemap, received ${type || "unknown content type"}`;
    }
    if (target.kind === "robots") {
      if (!type.includes("text/plain") && body.length === 0) {
        ok = false;
        reason = "empty robots response";
      }
      if (!body.includes("https://www.resofit.fit/sitemap.xml")) {
        ok = false;
        reason = "robots.txt does not declare the canonical www sitemap";
      }
    }
    if (target.kind === "json" && !type.includes("application/json")) {
      ok = false;
      reason = `expected JSON, received ${type || "unknown content type"}`;
    }
    if (target.kind === "api-validation") {
      ok = response.status === 400 && type.includes("application/json") && body.includes("cartToken is required");
      reason = ok
        ? "POST route reached; expected cartToken validation rejected the empty payload"
        : `expected HTTP 400 JSON cartToken validation, received HTTP ${response.status} (${type || "unknown content type"})`;
    }
    return {
      name: target.name,
      ok,
      status: response.status,
      finalUrl: response.url,
      contentType: type,
      elapsedMs,
      reason,
    };
  } catch (error) {
    return {
      name: target.name,
      ok: false,
      status: null,
      finalUrl: null,
      contentType: null,
      elapsedMs: Date.now() - started,
      reason: error?.name === "TimeoutError" ? `timeout after ${timeoutMs}ms` : String(error?.message || error),
    };
  }
}

async function firecrawlCheck() {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key || process.env.ENABLE_FIRECRAWL !== "true") {
    return { skipped: true, reason: "Firecrawl mirror check not enabled or API key not configured" };
  }

  const urls = ["https://www.resofit.fit/", "https://chatb2k.resofit.fit/"];
  const results = [];
  for (const url of urls) {
    const started = Date.now();
    try {
      const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
          timeout: timeoutMs,
        }),
        signal: AbortSignal.timeout(timeoutMs + 5000),
      });
      const payload = await response.json().catch(() => ({}));
      const markdown = payload?.data?.markdown || payload?.markdown || "";
      results.push({
        url,
        ok: response.ok && payload?.success !== false && markdown.trim().length > 0,
        status: response.status,
        markdownCharacters: markdown.length,
        elapsedMs: Date.now() - started,
        reason: response.ok && markdown.trim().length > 0 ? "scrape returned content" : (payload?.error || "no usable markdown returned"),
      });
    } catch (error) {
      results.push({ url, ok: false, status: null, markdownCharacters: 0, elapsedMs: Date.now() - started, reason: String(error?.message || error) });
    }
  }
  return { skipped: false, results };
}

const results = await Promise.all(targets.map(checkTarget));
const mirror = await firecrawlCheck();
for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.name} status=${result.status ?? "NETERR"} ms=${result.elapsedMs} type=${result.contentType || "-"} reason=${result.reason}`);
}
if (mirror.skipped) {
  console.log(`SKIP firecrawl: ${mirror.reason}`);
} else {
  for (const result of mirror.results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} firecrawl ${result.url} status=${result.status ?? "NETERR"} chars=${result.markdownCharacters} ms=${result.elapsedMs} reason=${result.reason}`);
  }
}
const failures = results.filter((result) => !result.ok).length + (mirror.skipped ? 0 : mirror.results.filter((result) => !result.ok).length);
console.log(`SUMMARY checks=${results.length + (mirror.skipped ? 0 : mirror.results.length)} failures=${failures}`);
if (failures > 0) process.exitCode = 1;
