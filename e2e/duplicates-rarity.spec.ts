import { expect, test, type Page } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import { catalogCardNames, catalogCards } from "./catalog";
import { TAG_INFO } from "../lib/search/tags";

test.use({ storageState: TESTER_AUTH_STATE });

async function pickTag(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Filter by tags" }).click();
  await page.getByPlaceholder("Search tags…").fill(label);
  await page.getByRole("option", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "Done" }).click();
}

test("tiles show their rarity", async ({ page }) => {
  await page.goto("/dex");
  await catalogCardNames(page);
  const first = catalogCards(page).first();
  await expect(first.getByTestId("card-rarity")).toBeVisible();
});

test("effects search sends rarity and duplicate choices with tags, types and paging", async ({
  page,
}) => {
  const bodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/search", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    bodies.push(body);
    const offset = (body.offset as number | undefined) ?? 0;
    const end = Math.min(offset + 60, 70);
    await route.fulfill({
      json: {
        filter: { surface: "any" },
        total: 70,
        usedFallback: false,
        cards: Array.from({ length: end - offset }, (_, i) => ({
          id: 900_000 + offset + i,
          name: `Poisoner ${offset + i}`,
          imageUrl: "/back.png",
          setCode: "A1",
          number: offset + i,
          cardType: "POKEMON",
          energyType: "grass",
          secondaryEnergyType: null,
          hp: 60,
          rarity: "SR",
          isEx: false,
          isTradeable: true,
          matchedTags: ["condition_poison"],
        })),
      },
    });
  });

  await page.goto("/dex");
  await catalogCardNames(page);
  await page.getByRole("button", { name: "Effects", exact: true }).click();

  await pickTag(page, TAG_INFO.condition_poison.label);
  await expect.poll(() => bodies.at(-1)).toMatchObject({
    tags: ["condition_poison"],
  });
  expect(bodies.at(-1)).not.toHaveProperty("showDuplicates");
  expect(bodies.at(-1)).not.toHaveProperty("rarities");

  const types = page.getByRole("group", { name: "Filter by type" });
  await types.getByRole("button", { name: "Grass" }).click();

  const rarity = page.getByRole("group", { name: "Filter by rarity" });
  await rarity.getByRole("button", { name: "Super Rare" }).click();
  await expect(
    rarity.getByRole("button", { name: "Super Rare" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => bodies.at(-1)).toMatchObject({
    tags: ["condition_poison"],
    types: ["grass"],
    rarities: ["SR"],
  });

  const toggle = page.getByRole("button", { name: "Show duplicates" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => bodies.at(-1)).toMatchObject({
    tags: ["condition_poison"],
    types: ["grass"],
    rarities: ["SR"],
    showDuplicates: true,
  });
  expect(bodies.at(-1)).not.toHaveProperty("offset");

  // Load more repeats the same request with an offset.
  await expect(catalogCards(page)).toHaveCount(60);
  await page.getByText(/Load more|Loading more/).scrollIntoViewIfNeeded();
  await expect(catalogCards(page)).toHaveCount(70);
  expect(bodies.at(-1)).toMatchObject({
    offset: 60,
    rarities: ["SR"],
    showDuplicates: true,
  });

  await toggle.click();
  await expect.poll(() => bodies.at(-1)).not.toHaveProperty("showDuplicates");
});

test("name search hides duplicate prints until the toggle is on", async ({
  page,
}) => {
  await page.goto("/dex");
  await catalogCardNames(page);

  // Pikachu ex has alt-art prints in Genetic Apex and later sets.
  await page.getByPlaceholder("Search by name...").fill("Pikachu ex");
  await expect(page.getByText("Searching names for “Pikachu ex”")).toBeVisible();
  // Wait for the name results to replace the set page before counting.
  const onlyMatches = async () => {
    const names = await catalogCardNames(page);
    return names.every((n) => n.toLowerCase().includes("pikachu ex"));
  };
  await expect.poll(onlyMatches).toBe(true);
  const deduped = await catalogCards(page).count();

  const toggle = page.getByRole("button", { name: "Show duplicates" });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => catalogCards(page).count())
    .toBeGreaterThan(deduped);

  expect(await onlyMatches()).toBe(true);

  await toggle.click();
  await expect.poll(() => catalogCards(page).count()).toBe(deduped);
});

test("the rarity filter narrows the set view", async ({ page }) => {
  await page.goto("/dex");
  await catalogCardNames(page);
  const rarity = page.getByRole("group", { name: "Filter by rarity" });
  await rarity.getByRole("button", { name: "Common", exact: true }).click();
  await expect
    .poll(async () => {
      const titles = await catalogCards(page)
        .getByTestId("card-rarity")
        .evaluateAll((els) => els.map((el) => el.getAttribute("title")));
      return titles.length > 0 && titles.every((t) => t === "Common");
    })
    .toBe(true);
});
