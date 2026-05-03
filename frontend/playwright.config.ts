import { defineConfig, devices } from "@playwright/test";

const backendOrigin = process.env.E2E_BACKEND_ORIGIN ?? "http://127.0.0.1:4000";
const frontendOrigin = process.env.E2E_FRONTEND_ORIGIN ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: frontendOrigin,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "cd ../backend && BACKEND_ADDR=:4000 go run ./cmd/server",
      url: `${backendOrigin}/guest/event-types`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `VITE_API_BASE_URL=${backendOrigin} npm run dev -- --host 127.0.0.1 --strictPort --port 5173`,
      url: frontendOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
