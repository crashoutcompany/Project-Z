import { expect, test } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import { catalogCardNames, catalogCards } from "./catalog";

test.use({ storageState: TESTER_AUTH_STATE });

test.beforeEach(async ({ page }) => {
  await page.goto("/dex");
});

test("switching sets loads that set's cards", async ({ page }) => {
  const tabs = page.getByRole("tab");
  await expect(tabs.nth(1)).toBeVisible();
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  const firstSet = await catalogCardNames(page);

  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => catalogCardNames(page)).not.toEqual(firstSet);
});

test("name search filters the catalog and clearing restores sets", async ({
  page,
}) => {
  const [name] = await catalogCardNames(page);

  await page.getByPlaceholder("Search by name...").fill(name);
  await expect(page.getByText(`Searching names for “${name}”`)).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect
    .poll(async () =>
      (await catalogCardNames(page)).every((alt) =>
        alt.toLowerCase().includes(name.toLowerCase()),
      ),
    )
    .toBe(true);

  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("tab").first()).toBeVisible();
  await expect(catalogCards(page).first()).toBeVisible();
});
