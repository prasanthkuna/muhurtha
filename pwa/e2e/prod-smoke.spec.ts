import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.MUHURTA_E2E_BASE_URL ?? "https://pwa-lyart-phi.vercel.app";
const MAGIC = process.env.MUHURTA_E2E_MAGIC_URL;
const AUTH_FILE = path.join(__dirname, ".auth", "prod-user.json");

test.describe.configure({ timeout: 120_000 });

test.describe.serial("Production smoke (content + tabs)", () => {
  test.skip(!MAGIC, "Set MUHURTA_E2E_MAGIC_URL (admin-magic-link with /auth/finish redirect).");

  test("01 magic link → today", async ({ browser }) => {
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    const ctx = await browser.newContext({ baseURL: BASE });
    const page = await ctx.newPage();
    await page.goto(MAGIC!, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await expect(page.getByTestId("today-loaded")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/Better for|Good windows|Show full timeline/i).first()).toBeVisible();
    await ctx.storageState({ path: AUTH_FILE });
    await ctx.close();
  });

  test("02 welcome (signed-out)", async ({ browser }) => {
    const ctx = await browser.newContext({ baseURL: BASE });
    const page = await ctx.newPage();
    await page.goto("/welcome");
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
    await ctx.close();
  });
});

test.describe.serial("Production signed-in tabs", () => {
  test.skip(!MAGIC, "Set MUHURTA_E2E_MAGIC_URL.");
  test.use({ storageState: AUTH_FILE });

  test.beforeAll(() => {
    test.skip(!fs.existsSync(AUTH_FILE), "Run prod-smoke 01 first or set MUHURTA_E2E_MAGIC_URL.");
  });

  test("03 decode", async ({ page }) => {
    await page.goto("/decode");
    await expect(page.getByTestId("decode-loaded")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Better for|Good windows|Show full timeline/i).first()).toBeVisible();
  });

  test("04 life", async ({ page }) => {
    await page.goto("/life");
    await expect(page.getByTestId("life-loaded")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("heading", { name: "Current" })).toBeVisible();
  });

  test("05 timing", async ({ page }) => {
    await page.goto("/timing");
    await expect(page.getByRole("button", { name: "Career interview" })).toBeVisible({
      timeout: 60_000,
    });
    await page.getByRole("button", { name: "Career interview" }).click();
    await page.getByRole("button", { name: "Run purpose check" }).click();
    await expect(page.getByText(/better|careful|window|slot/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test("06 ask", async ({ page }) => {
    await page.goto("/ask");
    await expect(page.getByRole("heading", { name: "One clear question" })).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByPlaceholder("Ask one thing…")).toBeVisible();
  });

  test("07 settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByTestId("settings-loaded")).toBeVisible({ timeout: 30_000 });
  });

  test("08 birth_pack_get via network", async ({ page }) => {
    const engineOk = page.waitForResponse(
      (r) => r.url().includes("/api/engine") && r.request().method() === "POST" && r.status() === 200,
      { timeout: 90_000 },
    );
    await page.goto("/today");
    const res = await engineOk;
    const json = (await res.json()) as Record<string, unknown>;
    const content = json.content as Record<string, unknown> | undefined;
    const luck =
      json.natal_luck ?? content?.natal_luck ?? (content?.me_profile as Record<string, unknown>)?.natal_luck;
    expect(luck).toBeTruthy();
  });
});
