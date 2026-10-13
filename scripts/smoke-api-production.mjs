#!/usr/bin/env node

/**
 * Read-only smoke checks for the canonical same-origin ResoFit API.
 * This script deliberately avoids payment creation, booking writes, and cron endpoints.
 */

const baseUrl = (process.env.BASE_URL || "https://www.resofit.fit").replace(/\/+$/, "");
const checks = [
  {
    name: "canonical homepage responds",
    url: baseUrl,
    method: "GET",
    expected: (response) => response.status >= 200 && response.status < 400,
  },
  {
    name: "Makaveli verification route validates missing reference",
    url: `${baseUrl}/api/makaveli/verify`,
    method: "GET",
    expected: (response) => response.status === 400,
  },
  {
    name: "cart route supports preflight without writing data",
    url: `${baseUrl}/api/cart`,
    method: "OPTIONS",
    headers: {
      Origin: "https://www.resofit.fit",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
    expected: (response) =>
      response.status === 204 &&
      /POST/.test(response.headers.get("access-control-allow-methods") || ""),
  },
];

let failures = 0;

for (const check of checks) {
  try {
    const response = await fetch(check.url, {
      method: check.method,
      headers: check.headers,
      redirect: "follow",
      signal: AbortSignal.timeout(30000),
    });
    const passed = check.expected(response);
    console.log(`${passed ? "PASS" : "FAIL"} ${check.method} ${check.url} -> ${response.status} — ${check.name}`);
    if (!passed) failures += 1;
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${check.method} ${check.url} — ${check.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log(`\nProduction API smoke: ${checks.length - failures}/${checks.length} passed; base=${baseUrl}`);
if (failures) process.exit(1);
