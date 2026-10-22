import { expect, test } from "@playwright/test";

test.describe.serial("Pro PWA flows (live Supabase + muhurtha-api)", () => {
  test("01 signed-in session loads real birth pack", async ({ page }) => {
    const storage = process.env.MUHURTA_E2E_STORAGE;
    test.skip(!storage, "Set MUHURTA_E2E_STORAGE from a saved Google/session state.");
    await page.goto("/today");
    await expect(page.getByTestId("today-loaded")).toBeVisible({ timeout: 90_000 });
    await expect(page.locator("h1")).not.toHaveText(/Sign in|Welcome/i);
  });

  test("02 decode tab shows identity from API pack", async ({ page }) => {
    await page.goto("/decode");
    await expect(page.getByTestId("decode-loaded")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("h1")).toHaveText(/.{8,}/);
  });

  test("03 life map spine and chapter page", async ({ page }) => {
    await page.goto("/life");
    await expect(page.getByTestId("life-loaded")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: /Current/ })).toBeVisible();

    const chapter = page.getByRole("link").filter({ hasText: /chapter|phase/i }).first();
    if (await chapter.isVisible()) {
      await chapter.click();
      await expect(page.getByRole("link", { name: /All chapters/i })).toBeVisible();
    }
  });

  test("04 settings reachable", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("settings-loaded")).toBeVisible({ timeout: 30_000 });
  });
});
