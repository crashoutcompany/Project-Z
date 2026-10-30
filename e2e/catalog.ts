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
