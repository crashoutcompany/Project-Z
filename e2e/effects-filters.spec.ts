import { expect, test, type Page } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import { catalogCardNames, catalogCards } from "./catalog";
import { TAG_INFO } from "../lib/search/tags";

test.use({ storageState: TESTER_AUTH_STATE });

async function openEffects(page: Page) {
  await page.goto("/dex");
  await catalogCardNames(page);
  await page.getByRole("button", { name: "Effects", exact: true }).click();
}

async function pickTag(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Filter by tags" }).click();
  await page.getByPlaceholder("Search tags…").fill(label);
  await page.getByRole("option", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "Done" }).click();
}

function fakeCard(i: number) {
  return {
    id: 900_000 + i,
    name: `Poisoner ${i}`,
    imageUrl: "/back.png",
    setCode: "A1",
    number: i,
    cardType: "POKEMON",
    energyType: "grass",
    secondaryEnergyType: null,
    hp: 60,
    rarity: "C",
    isEx: false,
    isTradeable: true,
    matchedTags: ["condition_poison"],
  };
}

test("a tag search shows every match and loads past the first page", async ({
  page,
}) => {
  // 75 matches, served 60 at a time, so the count cannot be the page size.
  const offsets: number[] = [];
  await page.route("**/api/search", async (route) => {
    const body = route.request().postDataJSON() as { offset?: number };
    const offset = body.offset ?? 0;
    offsets.push(offset);
    const end = Math.min(offset + 60, 75);
    await route.fulfill({
      json: {
        query: "",
        filter: { surface: "any" },
        total: 75,
        usedFallback: false,
        cards: Array.from({ length: end - offset }, (_, i) =>
          fakeCard(offset + i + 1),
        ),
      },
    });
  });

  await openEffects(page);
  await pickTag(page, TAG_INFO.condition_poison.label);

  await expect(page.getByText(/Filtering by 1 tag · 75 cards/)).toBeVisible();
  await expect(catalogCards(page)).toHaveCount(60);

  await page.getByText(/Load more|Loading more/).scrollIntoViewIfNeeded();
  await expect(catalogCards(page)).toHaveCount(75);
  await expect(page.getByText("All 75 cards loaded")).toBeVisible();
  expect(offsets).toEqual([0, 60]);
});

test("type filter is multi-select, shows removable pills and combines with tags", async ({
  page,
}) => {
  const bodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/search", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.continue();
  });

  await openEffects(page);
  const types = page.getByRole("group", { name: "Filter by type" });
  for (const name of [
    "Grass",
    "Fire",
    "Water",
    "Lightning",
    "Psychic",
    "Fighting",
    "Darkness",
    "Metal",
    "Dragon",
    "Colorless",
  ]) {
    await expect(types.getByRole("button", { name })).toBeVisible();
  }

  await types.getByRole("button", { name: "Grass" }).click();
  await types.getByRole("button", { name: "Psychic" }).click();
  await expect(types.getByRole("button", { name: "Grass" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(types.getByRole("button", { name: "Psychic" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByText(/Filtering by Grass or Psychic · \d/)).toBeVisible();
  await expect.poll(() => bodies.at(-1)?.types).toEqual(["grass", "psychic"]);

  await pickTag(page, TAG_INFO.heal.label);
  await expect
    .poll(() => bodies.at(-1))
    .toMatchObject({ tags: ["heal"], types: ["grass", "psychic"] });

  const filters = page.getByRole("group", { name: "Active filters" });
  await expect(
    filters.getByRole("button", { name: `Remove tag: ${TAG_INFO.heal.label}` }),
  ).toBeVisible();
  await filters.getByRole("button", { name: "Remove type: Grass" }).click();
  await expect(
    filters.getByRole("button", { name: "Remove type: Grass" }),
  ).toBeHidden();
  await expect(types.getByRole("button", { name: "Grass" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect.poll(() => bodies.at(-1)?.types).toEqual(["psychic"]);

  await filters.getByRole("button", { name: "Clear all" }).click();
  await expect(filters).toBeHidden();
  await expect(types.getByRole("button", { name: "Psychic" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("at 390px the effects controls fit and the hint does not clip", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openEffects(page);

  const input = page.getByPlaceholder(/Search by effect/);
  await expect(input).toHaveAttribute("placeholder", "Search by effect...");
  const fits = await input.evaluate((el: HTMLInputElement) => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = getComputedStyle(el).font;
    const style = getComputedStyle(el);
    const room =
      el.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    return ctx.measureText(el.placeholder).width <= room;
  });
  expect(fits).toBe(true);

  await page.getByRole("group", { name: "Filter by type" }).getByRole("button", { name: "Water" }).click();
  await expect(
    page.getByRole("button", { name: "Remove type: Water" }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the tag popover stays inside a short viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  await openEffects(page);
  await page.getByRole("combobox", { name: "Filter by tags" }).click();

  const done = page.getByRole("button", { name: "Done" });
  await expect(done).toBeVisible();
  const popup = page.locator('[data-slot="popover-content"]');
  const box = await popup.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(480);
  await expect(done).toBeInViewport();
});
