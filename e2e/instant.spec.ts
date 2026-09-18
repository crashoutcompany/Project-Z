import { expect, test, type Page } from "@playwright/test";
import { instant } from "@next/playwright";

type InstantPage = {
  path: string;
  heading: string | RegExp;
  /** Content that must stay behind Suspense and must not appear in the shell. */
  deferred?: string | RegExp;
};

/**
 * Auth-core only exposes guest shells for public routes. Gated pages are covered
 * by the authenticated e2e branch once TEST_AUTH_SECRET login is available.
 */
const PUBLIC_PAGES: InstantPage[] = [
  {
    path: "/",
    heading: /Discover, Trade, and/,
  },
  {
    path: "/signin",
    heading: "Sign in to your account",
  },
];

async function expectShell(page: Page, spec: InstantPage) {
  await expect(
    page.getByRole("heading", { name: spec.heading }).first(),
  ).toBeVisible();
  await expect(page.getByText("Pocket Trading").first()).toBeVisible();
  if (spec.deferred) {
    await expect(page.getByText(spec.deferred)).toHaveCount(0);
  }
}

test.describe("public page shells as a guest", () => {
  for (const spec of PUBLIC_PAGES) {
    test(`${spec.path} is instant on an initial page load`, async ({
      page,
      baseURL,
    }) => {
      await instant(
        page,
        async () => {
          await page.goto(spec.path);
          await expectShell(page, spec);
        },
        { baseURL },
      );
    });
  }

  test("gated routes redirect guests to sign-in", async ({ page }) => {
    await page.goto("/dex");
    await page.waitForURL((url) => url.pathname === "/signin");
    await expect(
      page.getByRole("heading", { name: "Sign in to your account" }),
    ).toBeVisible();
  });
});
