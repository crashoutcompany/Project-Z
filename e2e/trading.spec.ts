import { expect, test } from "@playwright/test";

import { TESTER_AUTH_STATE } from "./auth-state";
import { catalogCardNames, catalogCards } from "./catalog";

test.use({ storageState: TESTER_AUTH_STATE });

test("selecting want and give cards enables Continue", async ({ page }) => {
  await page.goto("/trading/create");
  const [wanted, given] = await catalogCardNames(page);
  const wantTab = page.getByRole("button", { name: /^Want \(\d+\)$/ });
  const giveTab = page.getByRole("button", { name: /^Give \(\d+\)$/ });

  await expect(page.getByRole("link", { name: "Continue" })).toHaveCount(0);

  await catalogCards(page).nth(0).click();
  await expect(wantTab).toHaveText("Want (1)");
  await expect(
    page.getByRole("button", { name: `Remove ${wanted}` }),
  ).toBeAttached();

  await giveTab.click();
  await catalogCards(page).nth(1).click();
  await expect(giveTab).toHaveText("Give (1)");
  await expect(
    page.getByRole("button", { name: `Remove ${given}` }),
  ).toBeAttached();

  await expect(page.getByRole("link", { name: "Continue" })).toHaveAttribute(
    "href",
    /^\/trading\/create\/confirm\?want=\d+&give=\d+$/,
  );
});

test("a card moves between lists instead of duplicating", async ({ page }) => {
  await page.goto("/trading/create");
  await catalogCardNames(page);
  const wantTab = page.getByRole("button", { name: /^Want \(\d+\)$/ });
  const giveTab = page.getByRole("button", { name: /^Give \(\d+\)$/ });

  await catalogCards(page).first().click();
  await expect(wantTab).toHaveText("Want (1)");

  await giveTab.click();
  await catalogCards(page).first().click();
  await expect(wantTab).toHaveText("Want (0)");
  await expect(giveTab).toHaveText("Give (1)");

  await catalogCards(page).first().click();
  await expect(giveTab).toHaveText("Give (0)");
});
