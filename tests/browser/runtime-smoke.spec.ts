import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const appUrl = (path: string) => new URL(path, BASE_URL).toString();
const routes = ["/", "/me", "/zaphira", "/product/res-dig-reset"] as const;

for (const route of routes) {
  test(`built production app route ${route} renders without uncaught exceptions`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
    const response = await page.goto(appUrl(route), { waitUntil: "domcontentloaded", timeout: 45000 });
    expect(response, `${route} should return an HTTP response`).not.toBeNull();
    expect(response!.status(), `${route} should not return a 5xx response`).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
    expect((await page.locator("body").innerText()).trim().length, `${route} should render visible content`).toBeGreaterThan(0);
    expect(pageErrors, `${route} uncaught browser exceptions:\n${pageErrors.join("\n\n")}`).toEqual([]);
  });
}

test("product detail renders server-loaded product data without the client loading placeholder", async ({ page }) => {
  const response = await page.goto(appUrl("/product/res-dig-reset"), {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  expect(response, "product detail should return an HTTP response").not.toBeNull();
  expect(response!.status(), "product detail should not return a 5xx response").toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "ResoFit 7-Day Meal & Workout Reset" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Loading product details…")).toHaveCount(0);
});

test("homepage exposes clear assessment, programs, equipment, membership, wellness and coaching paths", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(appUrl("/"), { waitUntil: "domcontentloaded" });
  const paths = page.locator('section[aria-labelledby="revenue-paths"] a');
  await expect(paths.filter({ hasText: "Get My Personalized Plan" })).toHaveAttribute("href", "/me");
  await expect(paths.filter({ hasText: "Build My Body" })).toHaveAttribute("href", "/programs");
  await expect(paths.filter({ hasText: "Premium Home Training" })).toHaveAttribute("href", "/shop");
  await expect(paths.filter({ hasText: "ResoLuxe Privé" })).toHaveAttribute("href", "/programs/resoluxe");
  await expect(paths.filter({ hasText: "Find a Wellness Experience" })).toHaveAttribute("href", "/wellness");
  await expect(paths.filter({ hasText: "Talk to CoachB2K" })).toHaveAttribute("href", /wa\.me/);
});

test("nutrition coaching checkout loads its canonical plan and pending bank-transfer path", async ({ page }) => {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? "failed"}`));
  const response = await page.goto(
    appUrl("/paystack/resofit-nutrition-coaching-1-month"),
    { waitUntil: "domcontentloaded" },
  );
  expect(response, "coaching checkout should return an HTTP response").not.toBeNull();
  expect(response!.status(), "coaching checkout should not return a 4xx/5xx response").toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Secure your wellness reset" })).toBeVisible();
  try {
    await expect(page.getByRole("heading", { name: "ResoFit Nutrition Coaching — 1 Month" })).toBeVisible({ timeout: 15000 });
  } catch (error) {
    throw new Error([
      String(error),
      "Rendered body: " + (await page.locator("body").innerText()),
      "Page errors: " + pageErrors.join("\\n"),
      "Console errors: " + consoleErrors.join("\\n"),
      "Failed requests: " + failedRequests.join("\\n"),
    ].join("\\n\\n"));
  }
  await expect(page.getByRole("button", { name: "Paystack" })).toBeVisible();
  await page.getByRole("button", { name: "Bank transfer" }).click();
  await expect(page.getByText("Union Bank · Resonance Fitness")).toBeVisible();
  await expect(page.getByText("Your access is not activated until a ResoFit administrator verifies the deposit.")).toBeVisible();
  await expect(page.getByRole("button", { name: /I have transferred/ })).toBeVisible();
  expect(pageErrors, `coaching checkout uncaught browser exceptions:\n${pageErrors.join("\n\n")}`).toEqual([]);
});

test("signed-in coaching checkout forwards the Supabase bearer to both payment endpoints", async ({ page }) => {
  const token = "mock-coaching-session-access-token";
  const userId = "f8775742-eb28-4b9a-8790-1022142005f3";
  const email = "test@resofit.fit";
  await page.addInitScript(({ accessToken, authUserId, authEmail }) => {
    const now = Math.floor(Date.now() / 1000);
    const session = JSON.stringify({
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: now + 3600,
      refresh_token: "mock-coaching-session-refresh-token",
      user: {
        id: authUserId,
        aud: "authenticated",
        role: "authenticated",
        email: authEmail,
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
    if (location.hostname === "resofit.fit" || location.hostname.endsWith(".resofit.fit")) {
      const domain = "; Domain=.resofit.fit; Path=/; Secure; SameSite=Lax";
      document.cookie = "rf_auth_session_v1_0=" + encodeURIComponent(session) + domain;
      document.cookie = "rf_auth_session_v1_count=1" + domain;
    } else if (location.hostname === "127.0.0.1" || location.hostname.endsWith(".vercel.app")) {
      localStorage.setItem("sb-vbqjvmnhdtdhmeeudqnn-auth-token", session);
    }
  }, { accessToken: token, authUserId: userId, authEmail: email });

  let transferAuthorization = "";
  let paystackAuthorization = "";
  let transferPayload: Record<string, unknown> | null = null;
  let paystackPayload: Record<string, unknown> | null = null;

  await page.route("**/functions/v1/resofit-bank-transfer-submit", async (route) => {
    transferAuthorization = route.request().headers()["authorization"] ?? "";
    transferPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        reference: "RF-BT-E2E-MOCK",
        amount_ngn: 4000,
        status: "pending_review",
        message: "Mock transfer submission recorded.",
      }),
    });
  });
  await page.route("**/functions/v1/paystack-init", async (route) => {
    paystackAuthorization = route.request().headers()["authorization"] ?? "";
    paystackPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authorization_url: "https://checkout.paystack.com/mock-checkout",
        reference: "RF-PS-E2E-MOCK",
      }),
    });
  });
  await page.route("https://checkout.paystack.com/mock-checkout", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Mock Paystack Checkout</title>" });
  });

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
  await page.goto(appUrl("/paystack/resofit-nutrition-coaching-1-month"), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "ResoFit Nutrition Coaching — 1 Month" })).toBeVisible();

  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Phone number").fill("+2348000000000");
  await page.getByRole("button", { name: "Bank transfer" }).click();
  await page.getByLabel("Transfer transaction reference (optional)").fill("BANK-TEST-REFERENCE-123");
  await page.getByRole("button", { name: /I have transferred/ }).click();
  await expect(page.getByText("Submission received — pending verification")).toBeVisible();
  expect(transferAuthorization).toBe(`Bearer ${token}`);
  expect(transferPayload?.sku).toBe("RF-COACH-NUTRI-01M");
  expect(transferPayload?.email).toBe(email);

  await page.getByRole("button", { name: "Paystack" }).click();
  await page.getByRole("button", { name: "Continue to secure checkout" }).click();
  await page.waitForURL("https://checkout.paystack.com/mock-checkout");
  expect(paystackAuthorization).toBe(`Bearer ${token}`);
  const items = paystackPayload?.items as Array<{ sku?: string }> | undefined;
  expect(items?.[0]?.sku).toBe("RF-COACH-NUTRI-01M");
  expect(pageErrors, `coaching checkout uncaught browser exceptions:\n${pageErrors.join("\n\n")}`).toEqual([]);
});

test("mobile navigation exposes the personalized assessment destination", async ({ page }) => {
  await page.goto(appUrl("/"), { waitUntil: "domcontentloaded" });
  const mobileMenu = page.locator("header details").filter({ has: page.locator('summary[aria-label="Open menu"]') });
  await expect(mobileMenu).toHaveCount(1);
  await expect(mobileMenu.locator('summary[aria-label="Open menu"]')).toHaveCount(1);
  await expect(mobileMenu.locator('a[href="/me"]').filter({ hasText: "Start My Personalized Plan" })).toHaveAttribute("href", "/me");
});

test("Zaphira partner page shows live products and preserves affiliate links to shop.resofit.fit", async ({ page }) => {
  const response = await page.goto(appUrl("/zaphira"), { waitUntil: "domcontentloaded", timeout: 45000 });
  expect(response, "Zaphira partner page should return an HTTP response").not.toBeNull();
  expect(response!.status(), "Zaphira partner page should not return a 4xx/5xx response").toBeLessThan(400);
  await expect(page.getByText("Zaphira · MsZap")).toBeVisible({ timeout: 15000 });
  const links = page.locator('a[href^="https://shop.resofit.fit/product/"]');
  await expect(links).toHaveCount(6, { timeout: 15000 });
  const hrefs = await links.evaluateAll((nodes) => nodes.map((node) => (node as HTMLAnchorElement).href));
  const paths = new Set(hrefs.map((href) => new URL(href).pathname));
  expect(paths.size).toBe(3);
  for (const href of hrefs) {
    const url = new URL(href);
    expect(url.searchParams.get("ref")).toBe("zaphira");
    expect(url.searchParams.get("utm_source")).toBe("bigo");
  }
});

test("shop.resofit.fit renders the three live recommended products", async ({ page }) => {
  const response = await page.goto("https://shop.resofit.fit/", { waitUntil: "domcontentloaded", timeout: 45000 });
  expect(response, "Shop subdomain should return an HTTP response").not.toBeNull();
  expect(response!.status(), "Shop subdomain should not return a 4xx/5xx response").toBeLessThan(400);
  const cards = page.locator('[data-testid="live-recommended-product"]');
  await expect(cards).toHaveCount(3, { timeout: 30000 });
  const skus = await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-sku")));
  expect(skus).toContain("PAYSTACK-25_STEEL_BONED_LATEX_SHAPER");
  expect(skus).toContain("res-dig-reset");
  expect(skus).toContain("SHOPIFY-PRODUCT-10410533650712");
});

test("Zaphira referral survives live product checkout initialization without charging Paystack", async ({ page }) => {
  let checkoutPayload: Record<string, unknown> | null = null;
  await page.route("**/functions/v1/paystack-init", async (route) => {
    checkoutPayload = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        authorization_url: "https://checkout.paystack.com/mock-zaphira-production-smoke",
        reference: "RF-ZAPHIRA-SMOKE",
      }),
    });
  });
  await page.route("https://checkout.paystack.com/mock-zaphira-production-smoke", async (route) => {
    await route.fulfill({ status: 200, contentType: "text/html", body: "<title>Mock Paystack Checkout</title>" });
  });

  await page.goto(
    "https://shop.resofit.fit/product/res-dig-reset?ref=zaphira&utm_source=bigo&utm_medium=affiliate",
    { waitUntil: "domcontentloaded", timeout: 45000 },
  );
  const buyButton = page.getByRole("button", { name: "Secure checkout with Paystack" });
  await expect(buyButton).toBeVisible({ timeout: 20000 });
  await buyButton.click();
  await page.getByLabel("Full name").fill("Zaphira Smoke Test");
  await page.getByLabel("Email address").fill("checkout-smoke@resofit.fit");
  await page.getByLabel("Phone number").fill("+2348000000000");
  await page.getByRole("button", { name: "Continue to secure checkout" }).click();
  await page.waitForURL("https://checkout.paystack.com/mock-zaphira-production-smoke");
  expect(checkoutPayload?.sku).toBe("res-dig-reset");
  expect(checkoutPayload?.ref).toBe("zaphira");
  expect(checkoutPayload?.utm_source).toBe("bigo");
  expect(checkoutPayload?.utm_medium).toBe("affiliate");
  expect(checkoutPayload?.funnel_origin).toBe("zaphira_partner_storefront");
});
