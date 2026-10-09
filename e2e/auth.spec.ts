import { expect, test } from "@playwright/test";

import { TEST_AUTH_HEADER } from "@/lib/test-auth";
import { TESTER_AUTH_STATE } from "./auth-state";

test.describe("as a guest", () => {
  for (const path of ["/dex", "/builder", "/trading", "/trading/create"]) {
    test(`${path} redirects to sign-in`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/signin$/);
      await expect(
        page.getByRole("heading", { name: "Sign in to your account" }),
      ).toBeVisible();
    });
  }
});

test.describe("as the tester", () => {
  test.use({ storageState: TESTER_AUTH_STATE });

  test("/signin redirects home", async ({ page }) => {
    await page.goto("/signin");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Sign Out" })).toBeVisible();
  });
});

// Signing out revokes the session, so mint a dedicated one instead of
// invalidating the shared tester cookie other specs run with.
test("sign out ends the session and re-gates pages", async ({ page }) => {
  const login = await page.request.post("/api/test-auth/login", {
    headers: { [TEST_AUTH_HEADER]: process.env.TEST_AUTH_SECRET!.trim() },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/dex");
  await expect(page.getByRole("heading", { name: "Card Dex" })).toBeVisible();

  await page.getByRole("button", { name: "Sign Out" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

  await page.goto("/dex");
  await expect(page).toHaveURL(/\/signin$/);
});
