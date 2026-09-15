import { expect, test, type Page } from "@playwright/test";
import { instant } from "@next/playwright";

async function expectShell(
  page: Page,
  heading: string | RegExp,
  deferred?: string | RegExp,
) {
  await expect(
    page.getByRole("heading", { name: heading }).first(),
  ).toBeVisible();
  await expect(page.getByText("Pocket Trading").first()).toBeVisible();
  if (deferred) {
    await expect(page.getByText(deferred)).toHaveCount(0);
  }
}

test.describe("trade loop instant shells", () => {
  test("/trading/create/confirm is instant on an initial page load", async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto("/trading/create/confirm");
        await expectShell(page, "Confirm trade", "A listing needs both sides.");
      },
      { baseURL },
    );
  });

  test("/trading/t/[id] is instant on an initial page load", async ({
    page,
    baseURL,
  }) => {
    await instant(
      page,
      async () => {
        await page.goto("/trading/t/not-a-real-listing");
        await expectShell(
          page,
          "Trade listing",
          "This listing is no longer valid.",
        );
      },
      { baseURL },
    );
  });
});
