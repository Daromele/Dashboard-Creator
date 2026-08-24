import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "list" : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    // Use a pre-installed Chromium when one is provided (CI images and this
    // container ship one), instead of downloading a browser.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run build && npx next start -p 3100",
        url: "http://127.0.0.1:3100/sign-in",
        reuseExistingServer: true,
        timeout: 180_000,
        env: { APP_URL: "http://127.0.0.1:3100" },
      },
});
