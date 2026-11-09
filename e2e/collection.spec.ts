import { expect, test, type Page } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import { catalogCards, catalogTiles } from "./catalog";

const STORAGE_KEY = "pz-collection";

test.use({ storageState: TESTER_AUTH_STATE });

test.beforeEach(async ({ page }) => {
  await page.goto("/dex");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(catalogCards(page).first()).toBeVisible();
});

function addBadge(page: Page) {
  return catalogTiles(page)
    .first()
    .getByRole("button", { name: "Add to collection" });
}

function ownedBadge(page: Page) {
  return catalogTiles(page)
    .first()
    .getByRole("button", { name: /^Owned: \d+/ });
}

async function collectedCount(page: Page) {
  const text = await page.getByTestId("collection-overall").textContent();
  return Number(text?.match(/([\d,]+) of/)?.[1].replace(/,/g, ""));
}

test("marking a card owned on the dex updates completion on /me", async ({
  page,
}) => {
  await page.goto("/me");
  await expect(page.getByTestId("collection-overall")).toContainText("0 of");

  await page.goto("/dex");
  await addBadge(page).click();
  await expect(ownedBadge(page)).toBeVisible();
  // Tapping the badge marks the card; it does not open the detail sheet.
  await expect(page.getByTestId("card-detail-sheet")).toHaveCount(0);

  await page.goto("/me");
  await expect.poll(() => collectedCount(page)).toBe(1);
});

test("the collection persists across reloads and can be cleared per card", async ({
  page,
}) => {
  await addBadge(page).click();
  await expect(ownedBadge(page)).toBeVisible();

  await page.reload();
  await expect(ownedBadge(page)).toBeVisible();

  await ownedBadge(page).click();
  await expect(addBadge(page)).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toBe("{}");
});

test("the detail sheet stepper sets the owned quantity", async ({ page }) => {
  await catalogCards(page).first().click();
  const sheet = page.getByTestId("card-detail-sheet");
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole("heading", { name: "Collection", exact: true }),
  ).toBeVisible();

  const increase = sheet.getByRole("button", { name: "Increase quantity" });
  await increase.click();
  await increase.click();
  await expect(sheet.getByTestId("collection-quantity")).toHaveText("2");

  await page.keyboard.press("Escape");
  await expect(ownedBadge(page)).toHaveAccessibleName(/^Owned: 2/);
});

test("corrupted or unknown stored data falls back safely", async ({ page }) => {
  await page.evaluate(
    (key) => localStorage.setItem(key, "{not json"),
    STORAGE_KEY,
  );
  await page.goto("/me");
  await expect(page.getByTestId("collection-overall")).toContainText("0 of");

  // Ids not in the catalog and out-of-range quantities are ignored.
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({ 999999999: 1, "-1": 3, abc: 2 }),
      ),
    STORAGE_KEY,
  );
  await page.reload();
  await expect(page.getByTestId("collection-overall")).toContainText("0 of");
});

test("/me lists missing cards and filters them by rarity", async ({ page }) => {
  await page.goto("/me");
  const firstSet = page.getByTestId("collection-set").first();
  await expect(firstSet).toBeVisible();

  await firstSet.getByRole("button", { name: /^Missing/ }).click();
  const missing = firstSet.getByTestId("missing-card");
  await expect(missing.first()).toBeVisible();
  const all = await missing.count();

  const rarityButtons = firstSet.getByTestId("missing-rarity-filter");
  if ((await rarityButtons.count()) > 0) {
    await rarityButtons.first().click();
    await expect.poll(() => missing.count()).toBeLessThan(all);
  }
});

test("the + on a missing card adds it to the collection", async ({ page }) => {
  await page.goto("/me");
  const overall = page.getByTestId("collection-overall");
  await expect(overall).toContainText("0 of");
  await expect(page.getByTestId("collection-overall-percent")).toHaveText("0%");

  const firstSet = page.getByTestId("collection-set").first();
  await firstSet.getByRole("button", { name: /^Missing/ }).click();
  const missing = firstSet.getByTestId("missing-card");
  const before = await missing.count();

  await missing.first().getByTestId("missing-card-add").click();

  await expect.poll(() => collectedCount(page)).toBe(1);
  await expect(missing).toHaveCount(before - 1);
  // One card no longer reads as 0%.
  await expect(page.getByTestId("collection-overall-percent")).not.toHaveText(
    "0%",
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
  ).toMatch(/^\{"\d+":1\}$/);
});
