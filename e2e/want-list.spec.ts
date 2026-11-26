import { expect, test, type Page } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import { catalogCardNames, catalogCards } from "./catalog";

const COLLECTION_KEY = "pz-collection";
const WANT_LIST_KEY = "pz-want-list";

test.use({ storageState: TESTER_AUTH_STATE });

function readStore(page: Page, key: string) {
  return page.evaluate(
    (k) =>
      JSON.parse(localStorage.getItem(k) ?? "{}") as Record<string, number>,
    key,
  );
}

test.beforeEach(async ({ page }) => {
  await page.goto("/builder");
  await page.evaluate(() => localStorage.clear());
});

test("bookmarking a missing deck card keeps it on the want list", async ({
  page,
}) => {
  // The missing-cards view needs a collection to compare against; an id
  // outside the catalog makes one without owning any deck card.
  await page.evaluate(
    (key) => localStorage.setItem(key, JSON.stringify({ 999999999: 1 })),
    COLLECTION_KEY,
  );
  await page.reload();
  const [name] = await catalogCardNames(page);
  await catalogCards(page).first().click();
  await catalogCards(page).first().click();

  const missing = page.getByTestId("deck-missing-card");
  await expect(missing).toHaveCount(1);
  await expect(missing).toContainText("0 of 2 owned");

  const want = missing.getByRole("button", {
    name: `Add ${name} to want list`,
  });
  await want.click();
  await expect(
    missing.getByRole("button", { name: `Remove ${name} from want list` }),
  ).toHaveAttribute("aria-pressed", "true");
  // It wants the copies the deck still needs.
  expect(Object.values(await readStore(page, WANT_LIST_KEY))).toEqual([2]);

  // The list is global and survives leaving the builder.
  await page.goto("/me");
  const list = page.getByTestId("want-list");
  const entry = list.getByTestId("want-list-card");
  await expect(entry).toHaveCount(1);
  await expect(entry).toContainText(name);
  await expect(list.getByTestId("want-list-total")).toHaveText(
    "2 copies wanted",
  );

  // "Got it" moves the wanted copies into the collection.
  await entry
    .getByRole("button", { name: `Got ${name}: add to collection` })
    .click();
  await expect(entry).toHaveCount(0);
  expect(await readStore(page, WANT_LIST_KEY)).toEqual({});
  const collection = await readStore(page, COLLECTION_KEY);
  expect(Object.values(collection).toSorted()).toEqual([1, 2]);
});

test("a missing deck card can be added to the collection from the same row", async ({
  page,
}) => {
  await page.evaluate(
    (key) => localStorage.setItem(key, JSON.stringify({ 999999999: 1 })),
    COLLECTION_KEY,
  );
  await page.reload();
  const [name] = await catalogCardNames(page);
  await catalogCards(page).first().click();

  const missing = page.getByTestId("deck-missing-card");
  await expect(missing).toHaveCount(1);
  await missing
    .getByRole("button", { name: `Add ${name} to collection` })
    .click();
  await expect(missing).toHaveCount(0);
  await expect(
    page.getByText("You own every card in this deck."),
  ).toBeVisible();
});

test("the card detail sheet adds any card to the want list", async ({
  page,
}) => {
  await page.goto("/dex");
  await catalogCards(page).first().click();
  const sheet = page.getByTestId("card-detail-sheet");
  await expect(sheet).toBeVisible();

  const want = sheet.getByTestId("want-toggle");
  await expect(want).toHaveText("Add to want list");
  await want.click();
  await expect(want).toHaveText("On want list");
  await expect(want).toHaveAttribute("aria-pressed", "true");
  expect(Object.values(await readStore(page, WANT_LIST_KEY))).toEqual([1]);

  // Wanting a card does not mark it owned.
  await expect(sheet.getByTestId("collection-quantity")).toHaveText("0");

  await page.goto("/me");
  const entry = page.getByTestId("want-list-card");
  await expect(entry).toHaveCount(1);
  await entry.getByRole("button", { name: /from want list$/ }).click();
  await expect(entry).toHaveCount(0);
  await expect(page.getByTestId("want-list")).toContainText("Nothing here yet");
});
