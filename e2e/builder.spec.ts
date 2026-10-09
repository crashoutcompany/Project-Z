import { expect, test, type Page } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import { catalogCardNames, catalogCards } from "./catalog";

test.use({ storageState: TESTER_AUTH_STATE });

function deckCount(page: Page, count: number) {
  return page.getByText(`${count}/20 cards`, { exact: true });
}

/** router.replace lands after the tray re-renders; wait for the URL to catch up. */
async function expectDeckUrlCards(page: Page, count: number) {
  await expect
    .poll(() => {
      const deck = new URL(page.url()).searchParams.get("deck") ?? "";
      return deck
        .split(",")
        .filter(Boolean)
        .reduce((sum, part) => sum + Number(/x(\d+)$/.exec(part)?.[1] ?? 1), 0);
    })
    .toBe(count);
}

test("adding and removing catalog cards updates the tray and URL", async ({
  page,
}) => {
  await page.goto("/builder");
  const [name] = await catalogCardNames(page);
  await expect(deckCount(page, 0)).toBeVisible();

  await catalogCards(page).first().click();
  await expect(deckCount(page, 1)).toBeVisible();
  await expectDeckUrlCards(page, 1);

  const slot = page.getByRole("button", { name: `Remove one ${name}` });
  await slot.click();
  await expect(deckCount(page, 0)).toBeVisible();
  await expect(slot).toHaveCount(0);
  await expectDeckUrlCards(page, 0);
});

test("a shared deck link restores the deck", async ({ page, context }) => {
  await page.goto("/builder");
  const [first, second] = await catalogCardNames(page);
  await catalogCards(page).nth(0).click();
  await catalogCards(page).nth(1).click();
  await expect(deckCount(page, 2)).toBeVisible();
  await expectDeckUrlCards(page, 2);

  const shared = await context.newPage();
  await shared.goto(page.url());
  await expect(deckCount(shared, 2)).toBeVisible();
  await expect(
    shared.getByRole("button", { name: `Remove one ${first}` }),
  ).toBeVisible();
  await expect(
    shared.getByRole("button", { name: `Remove one ${second}` }),
  ).toBeVisible();
});

test("a deck link with an unknown card reports it", async ({ page }) => {
  await page.goto("/builder?v=1&deck=A1-9999");
  await expect(page.getByText("Unknown card ref: A1-9999")).toBeVisible();
  await expect(deckCount(page, 0)).toBeVisible();
});

test.describe("a complete deck", () => {
  test.use({ permissions: ["clipboard-read", "clipboard-write"] });

  test("enables copying a shareable link", async ({ page }) => {
    await page.goto("/builder");
    const copy = page.getByRole("button", { name: "Copy link" });
    await expect(copy).toBeDisabled();

    // Two copies per card until 20; duplicate names are rejected by the rules.
    const cards = catalogCards(page);
    const total = await cards.count();
    for (let i = 0; i < total; i++) {
      if (await deckCount(page, 20).isVisible()) break;
      await cards.nth(i).click();
      await cards.nth(i).click();
    }
    await expect(deckCount(page, 20)).toBeVisible();

    await copy.click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    await expect(page).toHaveURL(copied);
  });
});

test("effects search shows the parsed filter", async ({ page }) => {
  await page.goto("/builder");
  await catalogCardNames(page);

  await page.getByPlaceholder(/Search by effect/).fill("coin flip");
  await expect(
    page.getByText("Searching effects for “coin flip”"),
  ).toBeVisible();
  await expect(page.getByText("coin_flip", { exact: true })).toBeVisible();
});
