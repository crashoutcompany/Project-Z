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

test("a set shows a Complete badge once every card is owned", async ({
  page,
}) => {
  await page.goto("/me");
  const firstSet = page.getByTestId("collection-set").first();
  await expect(firstSet.getByTestId("set-complete-badge")).toHaveCount(0);

  await firstSet.getByRole("button", { name: /^Missing/ }).click();
  const missing = firstSet.getByTestId("missing-card");
  await expect(missing.first()).toBeVisible();
  const ids = await missing.evaluateAll((items) =>
    items.map((item) => item.getAttribute("data-card-id")),
  );
  await page.evaluate(
    ([key, cardIds]) =>
      localStorage.setItem(
        key,
        JSON.stringify(Object.fromEntries(cardIds.map((id) => [id, 1]))),
      ),
    [STORAGE_KEY, ids] as const,
  );
  await page.reload();

  const completed = page.getByTestId("collection-set").first();
  await expect(completed.getByTestId("set-complete-badge")).toBeVisible();
  await expect(completed).toHaveAttribute("data-complete", "true");
  const count = await completed
    .getByTestId("collection-set-count")
    .textContent();
  const [owned, total] = (count ?? "").split("/");
  expect(owned).toBe(total);
});

test("export shows the stored collection as JSON", async ({ page }) => {
  await addBadge(page).click();
  await expect(ownedBadge(page)).toBeVisible();
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY,
  );

  await page.goto("/me");
  await page
    .getByTestId("collection-transfer")
    .getByRole("button", { name: /^Show/ })
    .click();
  await expect(page.getByTestId("collection-export")).toHaveValue(stored!);
});

test("import merges pasted JSON into the collection", async ({ page }) => {
  await page.goto("/me");
  const firstSet = page.getByTestId("collection-set").first();
  await firstSet.getByRole("button", { name: /^Missing/ }).click();
  const [a, b] = await firstSet
    .getByTestId("missing-card")
    .evaluateAll((items) =>
      items.slice(0, 2).map((item) => item.getAttribute("data-card-id")!),
    );

  await page.evaluate(
    ([key, id]) => localStorage.setItem(key, JSON.stringify({ [id]: 2 })),
    [STORAGE_KEY, a] as const,
  );
  await page.reload();

  const transfer = page.getByTestId("collection-transfer");
  await transfer.getByRole("button", { name: /^Show/ }).click();
  const input = page.getByTestId("collection-import");

  await input.fill("{not json");
  await transfer.getByRole("button", { name: "Import and merge" }).click();
  await expect(page.getByTestId("collection-import-status")).toHaveText(
    "That isn't valid JSON.",
  );

  await input.fill(JSON.stringify({ [a]: 1, [b]: 3, 999999999: 1 }));
  await transfer.getByRole("button", { name: "Import and merge" }).click();
  await expect(page.getByTestId("collection-import-status")).toContainText(
    "Merged 2 cards",
  );

  // The existing card keeps its larger quantity; the new one is added; the
  // unknown id is dropped.
  const stored = JSON.parse(
    (await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))!,
  );
  expect(stored).toEqual({ [a]: 2, [b]: 3 });
  await expect.poll(() => collectedCount(page)).toBe(2);
});
