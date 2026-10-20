import { expect, test } from "@playwright/test";

const phone = process.env.MUHURTA_E2E_PHONE ?? "9008393030";
const otp = process.env.MUHURTA_E2E_OTP;

test.describe.serial("Pro PWA flows (live Supabase + muhurtha-api)", () => {
  test("01 phone OTP sign-in loads real birth pack", async ({ page, context }) => {
    const storage = process.env.MUHURTA_E2E_STORAGE;
    if (storage) {
      await page.goto("/today");
      await expect(page.getByTestId("today-loaded")).toBeVisible({ timeout: 90_000 });
      return;
    }

    test.skip(!otp, "Set MUHURTA_E2E_OTP after SMS (6 digits).");
    await context.clearCookies();
    await page.goto("/auth");
    await page.getByTestId("auth-phone").fill(phone);
    await page.getByTestId("auth-send-otp").click();
    await expect(page.getByTestId("auth-otp")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("auth-otp").fill(otp!);
    await page.getByTestId("auth-verify").click();

    await expect(page).toHaveURL(/\/today/, { timeout: 30_000 });
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
    await expect(page.getByRole("heading", { name: "Current" })).toBeVisible();

    const chapter = page.locator('a[href^="/life/8-"]').first();
    await expect(chapter).toBeVisible();
    await chapter.click();
    await expect(page).toHaveURL(/\/life\/8-/);
    await expect(page.locator("h1")).toContainText(/Operational|Mercury|Flow/i);
  });

  test("04 timing purpose check hits engine", async ({ page }) => {
    await page.goto("/timing");
    await page.getByRole("button", { name: "Career move" }).click();
    await page.getByRole("button", { name: "Run purpose check" }).click();
    await expect(page.getByText("Result")).toBeVisible({ timeout: 45_000 });
  });

  test("05 ask sends question to engine", async ({ page }) => {
    await page.goto("/ask");
    const chip = page.getByRole("button", { name: /career/i }).first();
    await expect(chip).toBeVisible({ timeout: 60_000 });
    await chip.click();
    await expect(page.locator("main")).toContainText(/.{20,}/, { timeout: 60_000 });
  });
});
