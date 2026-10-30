import { expect, test } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import { catalogCardNames, catalogCards } from "./catalog";

test.use({ storageState: TESTER_AUTH_STATE });

test.beforeEach(async ({ page }) => {
  await page.goto("/dex");
});

test("switching sets loads that set's cards", async ({ page }) => {
  const tabs = page.getByRole("tab");
  await expect(tabs.nth(1)).toBeVisible();
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  const firstSet = await catalogCardNames(page);

  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => catalogCardNames(page)).not.toEqual(firstSet);
});

test("name search filters the catalog and clearing restores sets", async ({
  page,
}) => {
  const [name] = await catalogCardNames(page);

  await page.getByPlaceholder("Search by name...").fill(name);
  await expect(page.getByText(`Searching names for “${name}”`)).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect
    .poll(async () =>
      (await catalogCardNames(page)).every((alt) =>
        alt.toLowerCase().includes(name.toLowerCase()),
      ),
    )
    .toBe(true);

  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("tab").first()).toBeVisible();
  await expect(catalogCards(page).first()).toBeVisible();
});

test("tapping a card opens its detail sheet and a shareable link", async ({
  page,
}) => {
  const [name] = await catalogCardNames(page);
  const card = catalogCards(page).first();
  const ref = await card.getAttribute("data-card-ref");
  expect(ref).toBeTruthy();

  await card.click();
  const sheet = page.getByTestId("card-detail-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { level: 2 })).toContainText(name);
  await expect(page).toHaveURL(new RegExp(`card=${ref}`));

  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(page).not.toHaveURL(/card=/);
  await expect(card).toBeFocused();

  await page.goto(`/dex?card=${ref}`);
  await expect(page.getByTestId("card-detail-sheet")).toBeVisible();
  await page.getByTestId("card-detail-close").click();
  await expect(page.getByTestId("card-detail-sheet")).toHaveCount(0);
});

test("an expired session keeps the card art and asks to sign in", async ({
  page,
  context,
}) => {
  await catalogCardNames(page);
  await context.clearCookies();

  await catalogCards(page).first().click();
  const sheet = page.getByTestId("card-detail-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.locator("img")).toBeVisible();
  await expect(sheet.getByTestId("card-detail-sign-in")).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Sign in" })).toHaveAttribute(
    "href",
    /^\/signin\?next=%2Fdex%3F/,
  );
});

test.describe("on a 390px phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the detail sheet fits the screen", async ({ page }) => {
    await catalogCardNames(page);
    await catalogCards(page).first().click();

    const sheet = page.getByTestId("card-detail-sheet");
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(box).toMatchObject({ x: 0, width: 390 });
    await expect(page.getByTestId("card-detail-close")).toBeInViewport();
    expect(
      await sheet.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  });
});
