import { expect, test } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import { catalogCards } from "./catalog";

test.use({ storageState: TESTER_AUTH_STATE });

test.describe("collection tracking", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/dex");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("can mark a card as owned from the dex and see it on /me", async ({
    page,
  }) => {
    // Wait for cards to load
    await expect(catalogCards(page).first()).toBeVisible();

    // Find and click the collection badge on the first card
    const firstCard = catalogCards(page).first();
    const collectionBadge = firstCard.locator(
      'button[aria-label="Add to collection"]',
    );
    await expect(collectionBadge).toBeVisible();
    await collectionBadge.click();

    // Verify the badge changed to show owned state
    const ownedBadge = firstCard.locator(
      'button[aria-label*="Owned"][aria-label*="Click to remove"]',
    );
    await expect(ownedBadge).toBeVisible();

    // Navigate to /me and verify the card shows in the collection
    await page.goto("/me");
    await expect(page.getByText("Overall Progress")).toBeVisible();

    // Check that at least one card is now owned
    await expect(page.getByText(/1\/\d+/)).toBeVisible();
  });

  test("toggling collection persists across page reloads", async ({ page }) => {
    await expect(catalogCards(page).first()).toBeVisible();

    // Add card to collection
    const firstCard = catalogCards(page).first();
    const collectionBadge = firstCard.locator(
      'button[aria-label="Add to collection"]',
    );
    await collectionBadge.click();

    // Verify owned
    await expect(
      firstCard.locator('button[aria-label*="Owned"]'),
    ).toBeVisible();

    // Reload page
    await page.reload();
    await expect(catalogCards(page).first()).toBeVisible();

    // Verify still owned after reload
    await expect(
      firstCard.locator('button[aria-label*="Owned"]'),
    ).toBeVisible();
  });

  test("can remove card from collection", async ({ page }) => {
    await expect(catalogCards(page).first()).toBeVisible();

    // Add card to collection
    const firstCard = catalogCards(page).first();
    await firstCard.locator('button[aria-label="Add to collection"]').click();

    // Verify owned
    const ownedBadge = firstCard.locator('button[aria-label*="Owned"]');
    await expect(ownedBadge).toBeVisible();

    // Click to remove
    await ownedBadge.click();

    // Verify no longer owned
    await expect(
      firstCard.locator('button[aria-label="Add to collection"]'),
    ).toBeVisible();
  });

  test("card detail sheet shows collection controls", async ({ page }) => {
    await expect(catalogCards(page).first()).toBeVisible();

    // Click card to open detail sheet
    await catalogCards(page).first().click();
    const sheet = page.getByTestId("card-detail-sheet");
    await expect(sheet).toBeVisible();

    // Verify collection section exists
    await expect(sheet.getByText("Collection")).toBeVisible();
    await expect(sheet.getByText("owned")).toBeVisible();
  });

  test("/me shows completion stats per set", async ({ page }) => {
    await page.goto("/me");

    // Verify the page structure
    await expect(page.getByText("My Collection")).toBeVisible();
    await expect(page.getByText("Overall Progress")).toBeVisible();

    // Verify at least one set card is shown (sets exist in the database)
    await expect(page.locator("[class*=rounded-2xl]").first()).toBeVisible();
  });
});
