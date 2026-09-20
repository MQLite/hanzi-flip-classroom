import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT || "5175";
export default defineConfig({
  testDir: "./tests",
  testMatch: /(?:^|[\\/])(?:(?:workshop|sentence-train)-)?ui\.spec\.js$/,
  timeout: 30000,
  fullyParallel: false,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  },
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
  reporter: "list",
});
