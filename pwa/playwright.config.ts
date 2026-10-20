import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.MUHURTA_E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        browserName: "chromium",
      },
    },
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    storageState: process.env.MUHURTA_E2E_STORAGE
      ? process.env.MUHURTA_E2E_STORAGE
      : undefined,
  },
  webServer: process.env.MUHURTA_E2E_SKIP_SERVER
    ? undefined
    : {
        command: "bun run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
