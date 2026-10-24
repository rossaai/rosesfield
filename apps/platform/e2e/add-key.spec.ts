import { expect, type Page, test } from "@playwright/test"

const publicSettings = {
  settings: {
    mode: "public",
    engine: {
      target: "comfy-cloud",
      address: "https://cloud.comfy.org",
      key: "missing",
      origin: "demo",
    },
    lock: "none",
    agent: { model: "missing", models: [] },
    retentionDays: 30,
  },
}

const statuses: Readonly<Record<string, string>> = {
  "comfyui-good": "valid",
  "comfyui-free": "no-plan",
}

async function openPublic(page: Page): Promise<string[]> {
  const sentKeys: string[] = []
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.route("**/api/settings", async (route) => {
    const key = route.request().headers()["x-engine-key"]
    const engine = {
      ...publicSettings.settings.engine,
      ...(key === "comfyui-good" ? { key: "set", origin: "live" } : {}),
    }
    await route.fulfill({
      json: { settings: { ...publicSettings.settings, engine } },
    })
  })
  await page.route("**/api/account", async (route) => {
    const key = route.request().headers()["x-engine-key"]
    if (key !== undefined) {
      sentKeys.push(key)
    }
    const status = key === undefined ? "missing" : (statuses[key] ?? "wrong")
    await route.fulfill({
      json: {
        account: {
          key: status,
          credits: status === "valid" ? 4201.5 : null,
          retentionDays: 30,
          cap: null,
        },
      },
    })
  })
  await page.goto("/")
  return sentKeys
}

async function pasteKey(page: Page, key: string): Promise<void> {
  await page
    .locator("[data-slot='app-bar']")
    .getByRole("button", { name: "Connect", exact: true })
    .filter({ hasText: "Connect" })
    .click()
  const dialog = page.getByRole("dialog")
  await expect(
    dialog.getByRole("link", { name: "Open Comfy's key page" })
  ).toHaveAttribute("href", "https://platform.comfy.org/profile/api-keys")
  await dialog.locator("input").fill(key)
  await dialog.getByRole("button", { name: "Add key" }).click()
}

test("a key Comfy accepts puts your balance in the header within 3 seconds and moves Connect on to the command", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the top bar names the action")
  const sentKeys = await openPublic(page)
  await pasteKey(page, "comfyui-good")
  await expect(
    page
      .locator("header[data-slot='app-bar']")
      .getByText("4,202", { exact: true })
  ).toBeVisible({ timeout: 3000 })
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("button", { name: "Copy" })).toBeVisible()
  expect(sentKeys).toContain("comfyui-good")
})

test("a key with no paid plan says why and links to Comfy billing", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "the top bar names the action")
  await openPublic(page)
  await pasteKey(page, "comfyui-free")
  const alert = page.getByRole("dialog").getByRole("alert")
  await expect(
    alert.getByText("This key's account has no paid Comfy plan")
  ).toBeVisible()
  await expect(
    alert.getByRole("link", { name: "Open Comfy billing" })
  ).toHaveAttribute("href", "https://platform.comfy.org")
})
