import { expect, test, type Page } from "@playwright/test";
import { instant } from "@next/playwright";

import { TESTER_AUTH_STATE } from "./auth-state";

type InstantPage = {
  path: string;
  heading: string | RegExp;
  /** Content that must stay behind Suspense and must not appear in the shell. */
  deferred?: string | RegExp;
};

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

const GATED_PAGES: InstantPage[] = [
  {
    path: "/dex",
    heading: "Card Dex",
    deferred: "No card sets found.",
  },
  {
    path: "/builder",
    heading: "Deck Builder",
    deferred: "No card sets found.",
  },
  {
    path: "/trading",
    heading: "Trading",
  },
  {
    path: "/trading/create",
    heading: "Create a Trade",
    deferred: "No card sets found.",
  },
  {
    path: "/me",
    heading: "Me Page",
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
});

test.describe("gated page shells as the tester", () => {
  test.use({ storageState: TESTER_AUTH_STATE });

  for (const spec of GATED_PAGES) {
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

  test("home → dex client navigation is instant", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Discover, Trade, and/ }),
    ).toBeVisible();

    await instant(page, async () => {
      await page.getByRole("link", { name: "Browse the Dex" }).first().click();
      await page.waitForURL((url) => url.pathname === "/dex");
      await expectShell(page, {
        path: "/dex",
        heading: "Card Dex",
        deferred: "No card sets found.",
      });
    });
  });

  test("home → trading client navigation is instant", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Discover, Trade, and/ }),
    ).toBeVisible();

    await instant(page, async () => {
      await page
        .getByRole("link", { name: "Start Trading", exact: true })
        .click();
      await page.waitForURL((url) => url.pathname === "/trading");
      await expectShell(page, { path: "/trading", heading: "Trading" });
    });
  });
});
