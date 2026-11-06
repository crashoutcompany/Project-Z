import { expect, test, type Page } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import {
  catalogCardNames,
  catalogCards,
  openFilters,
  resultSummary,
} from "./catalog";

test.use({ storageState: TESTER_AUTH_STATE });

test.beforeEach(async ({ page }) => {
  await page.goto("/dex");
});

/** The `{set}-{number}` refs of the cards on screen. */
function cardRefs(page: Page) {
  return catalogCards(page).evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-card-ref") ?? ""),
  );
}

/** Picks the second-oldest set (the oldest leads "All sets" anyway). */
async function pickSecondSet(page: Page) {
  await page.getByRole("combobox", { name: "Filter by set" }).click();
  const options = page.getByRole("option");
  const option = options.nth((await options.count()) - 2);
  const code = (await option.locator("span").first().textContent())!.trim();
  const name = (await option.locator("span").last().textContent())!.trim();
  await option.click();
  await page.getByRole("button", { name: "Done" }).click();
  return { code, name };
}

test("opens on every set with a result count", async ({ page }) => {
  await catalogCardNames(page);
  await expect(resultSummary(page)).toHaveText(/^All sets · [\d,]+ cards$/);
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("the set filter narrows the catalog and clears from its chip", async ({
  page,
}) => {
  await catalogCardNames(page);
  const { code, name } = await pickSecondSet(page);

  await expect(resultSummary(page)).toContainText(name);
  await expect
    .poll(async () =>
      (await cardRefs(page)).every((r) => r.startsWith(`${code}-`)),
    )
    .toBe(true);

  const chip = page
    .getByRole("group", { name: "Active filters" })
    .getByRole("button", { name: `Remove set: ${name}` });
  await chip.click();
  await expect(chip).toBeHidden();
  await expect(resultSummary(page)).toContainText("All sets");
});

test("name search filters the catalog and clearing restores browsing", async ({
  page,
}) => {
  const [name] = await catalogCardNames(page);

  await page.getByPlaceholder("Search by name...").fill(name);
  await expect(resultSummary(page)).toContainText(
    `Searching names for “${name}”`,
  );
  await expect
    .poll(async () =>
      (await catalogCardNames(page)).every((alt) =>
        alt.toLowerCase().includes(name.toLowerCase()),
      ),
    )
    .toBe(true);
  await expect(resultSummary(page)).toHaveText(/· [\d,]+ cards?$/);

  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(resultSummary(page)).toContainText("All sets");
  await expect(catalogCards(page).first()).toBeVisible();
});

test("the set filter works alongside a name search", async ({ page }) => {
  await catalogCardNames(page);
  const { code } = await pickSecondSet(page);
  await expect
    .poll(async () =>
      (await cardRefs(page)).every((r) => r.startsWith(`${code}-`)),
    )
    .toBe(true);
  const [name] = await catalogCardNames(page);

  await page.getByPlaceholder("Search by name...").fill(name);
  await expect(resultSummary(page)).toContainText(`“${name}”`);
  await expect
    .poll(async () => {
      const refs = await cardRefs(page);
      const names = await catalogCardNames(page);
      return (
        refs.every((r) => r.startsWith(`${code}-`)) &&
        names.every((n) => n.toLowerCase().includes(name.toLowerCase()))
      );
    })
    .toBe(true);
});

test("the Name tab filters by type with the official Energy icons", async ({
  page,
}) => {
  await catalogCardNames(page);
  const types = page.getByRole("group", { name: "Filter by type" });
  const grass = types.getByRole("button", { name: "Grass" });
  await expect(
    grass.locator('img[src="/images/types/grass.png"]'),
  ).toBeVisible();
  const before = await resultSummary(page).textContent();

  await grass.click();
  await expect(grass).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Remove type: Grass" }),
  ).toBeVisible();
  await expect(resultSummary(page)).toHaveText(/· [\d,]+ cards?$/);
  await expect(resultSummary(page)).not.toHaveText(before ?? "");
});

test("each tab keeps its own query and the filters carry over", async ({
  page,
}) => {
  const bodies: Array<Record<string, unknown>> = [];
  await page.route("**/api/search", async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.continue();
  });
  const [name] = await catalogCardNames(page);
  const input = page.getByRole("searchbox");

  await page.getByPlaceholder("Search by name...").fill(name);
  await expect(resultSummary(page)).toContainText(`“${name}”`);
  await page
    .getByRole("group", { name: "Filter by type" })
    .getByRole("button", { name: "Fire" })
    .click();

  await page.getByRole("button", { name: "Effects", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(input).toHaveAttribute("placeholder", /Search by effect/);
  // The type picked on Name narrows the Effects results too.
  await expect(resultSummary(page)).toContainText("Filtering by Fire");
  await expect.poll(() => bodies.at(-1)?.types).toEqual(["fire"]);

  await page.getByRole("button", { name: "Name", exact: true }).click();
  await expect(input).toHaveValue(name);
  await expect(resultSummary(page)).toContainText(
    `Searching names for “${name}”`,
  );
});

test("the search and filter bar stays on screen while scrolling", async ({
  page,
}) => {
  await catalogCardNames(page);
  const toolbar = page.getByTestId("search-toolbar");
  await page.mouse.wheel(0, 1500);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(500);
  await expect(toolbar).toHaveAttribute("data-stuck", "true");
  const box = await toolbar.boundingBox();
  // Pinned just under the 64px navbar.
  expect(box?.y).toBeCloseTo(64, 0);
  await expect(page.getByRole("searchbox")).toBeInViewport();
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

  test("filters open in a sheet with 44px tap targets", async ({ page }) => {
    await catalogCardNames(page);
    await expect(page.getByTestId("filter-bar")).toBeHidden();
    const button = page.getByRole("button", { name: /^Filters/ });
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    const sheet = await openFilters(page);
    const types = sheet.getByRole("group", { name: "Filter by type" });
    for (const box of await types
      .getByRole("button")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()))) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await types.getByRole("button", { name: "Water" }).click();
    await sheet.getByRole("button", { name: /^Show [\d,]+ cards?$/ }).click();
    await expect(sheet).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Remove type: Water" }),
    ).toBeVisible();
    await expect(button).toContainText("1");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("the detail sheet fits the screen", async ({ page }) => {
    await catalogCardNames(page);
    await catalogCards(page).first().click();

    const sheet = page.getByTestId("card-detail-sheet");
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(box).toMatchObject({ x: 0, width: 390 });
    await expect(page.getByTestId("card-detail-close")).toBeInViewport();
    expect(await sheet.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
  });
});

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the navbar offers Sign In, never Sign Out", async ({ page }) => {
    // /dex sends guests to sign in; the home page is public.
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Out" })).toHaveCount(0);
  });
});
