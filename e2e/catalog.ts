import { expect, type Page } from "@playwright/test";

/** Cards in the shared CardBrowser grid (dex, builder, trade create). */
export function catalogCards(page: Page) {
  return page.locator(".catalog-results > *");
}

/** Waits for the first catalog page to render and returns its card names. */
export async function catalogCardNames(page: Page) {
  await expect(catalogCards(page).first()).toBeVisible();
  return catalogCards(page)
    .locator("img")
    .evaluateAll((imgs) => imgs.map((img) => img.getAttribute("alt") ?? ""));
}

/** The results line above the grid, e.g. "All sets · 1,204 cards". */
export function resultSummary(page: Page) {
  return page.getByTestId("result-summary").filter({ visible: true });
}

/**
 * Where the filters live at this width: the inline bar, or (on phones) the
 * sheet behind the Filters button, which this opens.
 */
export async function openFilters(page: Page) {
  const button = page.getByRole("button", { name: /^Filters/ });
  if (await button.isVisible()) {
    await button.click();
    const sheet = page.getByTestId("filter-sheet");
    await expect(sheet).toBeVisible();
    return sheet;
  }
  return page.getByTestId("filter-bar");
}

/** Picks rarities from the bar's popover, then closes it. */
export async function pickRarities(page: Page, names: string[]) {
  await page.getByRole("button", { name: "Filter by rarity" }).click();
  const group = page.getByRole("group", { name: "Filter by rarity" });
  for (const name of names) {
    await group.getByRole("button", { name, exact: true }).click();
  }
  await page.getByRole("button", { name: "Done" }).click();
  await expect(group).toBeHidden();
}

/** Picks sets by name from the set combobox, then closes it. */
export async function pickSets(page: Page, names: string[]) {
  await page.getByRole("combobox", { name: "Filter by set" }).click();
  const search = page.getByPlaceholder("Search sets…");
  for (const name of names) {
    await search.fill(name);
    await page.getByRole("option", { name }).first().click();
  }
  await page.getByRole("button", { name: "Done" }).click();
  await expect(search).toBeHidden();
}
