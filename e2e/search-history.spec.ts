import { expect, test } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import { catalogCardNames, catalogCards, resultSummary } from "./catalog";

test.use({ storageState: TESTER_AUTH_STATE });

const PARSED = { surface: "attack", attack: { tags: ["coin_flip"] } };

test("a saved search restores its query and filters, and recents persist", async ({
  page,
}) => {
  const bodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/search", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    bodies.push(body);
    await route.fulfill({
      json: {
        filter: PARSED,
        total: 3,
        usedFallback: false,
        cards: Array.from({ length: 3 }, (_, i) => ({
          id: 910_000 + i,
          name: `Flipper ${i}`,
          imageUrl: "/back.png",
          setCode: "A1",
          number: i + 1,
          cardType: "POKEMON",
          energyType: "grass",
          secondaryEnergyType: null,
          hp: 70,
          rarity: "C",
          isEx: false,
          isTradeable: true,
          matchedTags: ["coin_flip"],
        })),
      },
    });
  });

  await page.goto("/dex");
  await catalogCardNames(page);
  await page.getByRole("button", { name: "Effects", exact: true }).click();
  const search = page.getByPlaceholder(/Search by effect/);
  await search.fill("coin flip");
  await page
    .getByRole("group", { name: "Filter by type" })
    .getByRole("button", { name: "Grass" })
    .click();
  await expect(resultSummary(page)).toHaveText(
    "Searching effects for “coin flip” · 3 cards",
  );

  // Name and save it.
  await page.getByRole("button", { name: "Save search" }).click();
  const name = page.getByRole("textbox", { name: "Name this search" });
  await expect(name).toHaveValue("coin flip");
  await name.fill("Grass coin flips");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(name).toBeHidden();

  // Start over, then run it from the dropdown.
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(search).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Remove type: Grass" }),
  ).toBeHidden();

  await search.click();
  const dropdown = page.getByRole("region", {
    name: "Recent and saved searches",
  });
  await expect(dropdown.getByText("Grass coin flips")).toBeVisible();
  // The settled search also became a recent.
  await expect(
    dropdown.getByRole("button", { name: /“coin flip”\s*Effects · Grass/ }),
  ).toBeVisible();

  bodies.length = 0;
  await dropdown.getByRole("button", { name: /^Grass coin flips/ }).click();
  await expect(dropdown).toBeHidden();
  await expect(search).toHaveValue("coin flip");
  await expect(
    page.getByRole("button", { name: "Remove type: Grass" }),
  ).toBeVisible();
  await expect(resultSummary(page)).toHaveText(
    "Searching effects for “coin flip” · 3 cards",
  );
  await expect(catalogCards(page)).toHaveCount(3);
  // The rerun sends every filter plus the stored parse, so it can't drift.
  await expect
    .poll(() => bodies.at(-1))
    .toMatchObject({ query: "coin flip", types: ["grass"], filter: PARSED });

  // Rename, then delete.
  await search.click();
  await dropdown
    .getByRole("button", { name: "Rename Grass coin flips" })
    .click();
  await dropdown.getByRole("textbox", { name: "Search name" }).fill("Flips");
  await page.keyboard.press("Enter");
  await expect(dropdown.getByText("Flips", { exact: true })).toBeVisible();
  await dropdown.getByRole("button", { name: "Delete Flips" }).click();
  await expect(dropdown.getByText("Flips", { exact: true })).toBeHidden();

  // Recents survive a reload and clear in one go.
  await page.reload();
  await catalogCardNames(page);
  await page.getByPlaceholder("Search by name...").click();
  await expect(
    dropdown.getByRole("button", { name: /“coin flip”\s*Effects · Grass/ }),
  ).toBeVisible();
  await dropdown.getByRole("button", { name: "Clear recent" }).click();
  await expect(dropdown).toBeHidden();
});
