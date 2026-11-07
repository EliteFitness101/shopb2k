import { test, expect } from "@playwright/test";

const routes = ["/", "/me", "/product/resoflex-hips-booty-oil"] as const;

for (const route of routes) {
  test(`built production app route ${route} renders without uncaught exceptions`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
    const response = await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    expect(response, `${route} should return an HTTP response`).not.toBeNull();
    expect(response!.status(), `${route} should not return a 5xx response`).toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
    expect((await page.locator("body").innerText()).trim().length, `${route} should render visible content`).toBeGreaterThan(0);
    expect(pageErrors, `${route} uncaught browser exceptions:\n${pageErrors.join("\n\n")}`).toEqual([]);
  });
}

test("product detail renders server-loaded product data without the client loading placeholder", async ({ page }) => {
  const response = await page.goto("http://127.0.0.1:4173/product/resoflex-hips-booty-oil", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  expect(response, "product detail should return an HTTP response").not.toBeNull();
  expect(response!.status(), "product detail should not return a 5xx response").toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "ResoFlex Hips & Booty Oil" })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Loading product details…")).toHaveCount(0);
});

test("homepage exposes clear assessment, programs, equipment, membership, wellness and coaching paths", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
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
    "http://127.0.0.1:4173/paystack/resofit-nutrition-coaching-1-month",
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
    if (location.hostname !== "127.0.0.1") return;
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem("sb-vbqjvmnhdtdhmeeudqnn-auth-token", JSON.stringify({
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
    }));
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
  await page.goto("http://127.0.0.1:4173/paystack/resofit-nutrition-coaching-1-month", {
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
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
  const mobileMenu = page.locator("header details").filter({ has: page.locator('summary[aria-label="Open menu"]') });
  await expect(mobileMenu).toHaveCount(1);
  await expect(mobileMenu.locator('summary[aria-label="Open menu"]')).toHaveCount(1);
  await expect(mobileMenu.locator('a[href="/me"]').filter({ hasText: "Start My Personalized Plan" })).toHaveAttribute("href", "/me");
});
