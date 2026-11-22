import { expect, type Page } from "@playwright/test";

/**
 * A promise with its resolver, for holding a mocked response until the test
 * releases it (e.g. page 2 of a search until page 1 has been counted).
 */
export function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Cards in the shared CardBrowser grid (dex, builder, trade create). */
export function catalogCards(page: Page) {
  return page.locator(".catalog-results [data-catalog-card]");
}

/** Grid cells: a card plus any controls beside it, e.g. the dex collection badge. */
export function catalogTiles(page: Page) {
  return page.locator(".catalog-results > *");
}

/** Waits for the first catalog page to render and returns its card names. */
export async function catalogCardNames(page: Page) {
  await expect(catalogCards(page).first()).toBeVisible();
  // The first image is the card art; the rest are its rarity mark.
  return catalogCards(page).evaluateAll((cards) =>
    cards.map((card) => card.querySelector("img")?.getAttribute("alt") ?? ""),
  );
}

/**
 * Scrolls to the bottom until the grid holds `count` cards. Infinite scroll
 * swaps the "Load more" button for a spinner (and drops it once everything is
 * loaded), so the scroll comes first. The grid's IntersectionObserver can miss
 * that scroll and leave "Load more" on screen with no request sent, so a
 * visible button is clicked as the fallback rather than trusting the observer.
 */
export async function scrollToLoadCards(page: Page, count: number) {
  const cards = catalogCards(page);
  const loadMore = page.getByRole("button", { name: /^Load more/ });
  await expect(async () => {
    await page.evaluate(() =>
      window.scrollTo(0, document.scrollingElement?.scrollHeight ?? 0),
    );
    if ((await cards.count()) < count && (await loadMore.isVisible())) {
      // The button can re-render into the spinner between the check and the
      // click; that means a load started, so a missed click is fine.
      await loadMore.click({ timeout: 1_000 }).catch(() => {});
    }
    await expect(cards).toHaveCount(count, { timeout: 1_000 });
  }).toPass();
}

/** The results line above the grid, e.g. "All sets · 1,204 cards". */
export function resultSummary(page: Page) {
  return page.getByTestId("result-summary");
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

/**
 * Opens the bar's rarity popover and returns its option group. The closed
 * phone filter sheet holds a second "Filter by rarity" group, so callers get
 * the one inside the open popover, never the page-wide role match.
 */
export async function openRarityPopover(page: Page) {
  const trigger = page.getByRole("button", { name: "Filter by rarity" });
  const popover = page.locator('[data-slot="popover-content"]');
  const group = popover.getByTestId("rarity-filter");

  await trigger.click();
  // A click that lands before hydration does not open the popover; retry once,
  // unless the trigger already reports it open (a slow open, not a lost click).
  try {
    await expect(group).toBeVisible({ timeout: 2_000 });
  } catch {
    if ((await trigger.getAttribute("aria-expanded")) !== "true") {
      await trigger.click();
    }
    await expect(group).toBeVisible();
  }
  return { popover, group };
}

/** Picks rarities from the bar's popover, then closes it. */
export async function pickRarities(page: Page, names: string[]) {
  const { popover, group } = await openRarityPopover(page);
  for (const name of names) {
    await group.getByRole("button", { name, exact: true }).click();
  }
  await popover.getByRole("button", { name: "Done" }).click();
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
