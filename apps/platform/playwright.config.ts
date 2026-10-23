import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { defineConfig } from "@playwright/test"

const gatewayPort = 8797
const platformPort = 5179
const gatewayOrigin = `http://127.0.0.1:${gatewayPort}`
const dataDir = mkdtempSync(join(tmpdir(), "rosesfield-e2e-"))

export default defineConfig({
  testDir: "./e2e",
  outputDir: join(tmpdir(), "rosesfield-e2e-results"),
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${platformPort}`,
    browserName: "chromium",
    headless: true,
  },
  metadata: { gatewayOrigin },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    {
      name: "phone",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: "bunx vite build && bun ../../services/gateway/src/main.ts",
      url: `${gatewayOrigin}/api/health`,
      env: {
        COMFY_API_KEY: "",
        OWNER_TOKEN: "",
        HOST: "127.0.0.1",
        PORT: String(gatewayPort),
        DATA_DIR: dataDir,
      },
      reuseExistingServer: false,
    },
    {
      command: `bunx vite --port ${platformPort} --strictPort --host 127.0.0.1`,
      url: `http://127.0.0.1:${platformPort}`,
      env: { ROSESFIELD_GATEWAY: gatewayOrigin },
      reuseExistingServer: false,
    },
  ],
})
