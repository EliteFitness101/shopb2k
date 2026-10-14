import { test, expect } from "@playwright/test";

const routes = ["/", "/me", "/product/resoflex-hips-booty-oil"] as const;

for (const route of routes) {
  test(`built production app route ${route} renders without uncaught exceptions`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.stack ?? error.message));
    const response = await page.goto(`http://127.0.0.1:4173${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    expect(response, `${route} should return an HTTP response`).not.toBeNull();
    expect(response!.status(), `${route} should not return a 5xx response`).toBeLessThan(500);
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
  expect(response!.status(), "product detail should not return a 5xx response").toBeLessThan(500);
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

test("mobile menu opens and routes directly to the personalized assessment", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => window.innerWidth)).toBeLessThan(1280);
  const menu = page.locator('summary[aria-label="Open menu"]');
  await expect(menu).toBeVisible();
  await menu.click();
  const assessmentLink = page.getByRole("link", { name: "Start My Personalized Plan" });
  await expect(assessmentLink).toBeVisible();
  await assessmentLink.click();
  await expect(page).toHaveURL(/\/me(?:[/?#]|$)/);
});
