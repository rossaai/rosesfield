import { expect, type Page, test } from "@playwright/test"

const ownerSettings = {
  settings: {
    mode: "owner",
    engine: {
      target: "comfy-cloud",
      address: "https://cloud.comfy.org",
      key: "set",
      origin: "live",
    },
    lock: "local",
    agent: {
      model: "set",
      models: [{ provider: "comfy-router", id: "deepseek/deepseek-v4-flash" }],
    },
  },
}

async function openAgent(page: Page, models: unknown): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.route("**/api/settings", (route) =>
    route.fulfill({ json: ownerSettings })
  )
  await page.route("**/api/agent/models", (route) =>
    route.fulfill({ json: models })
  )
  await page.goto("/agent")
}

test("with no Comfy key the agent asks for the key and offers no composer", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/agent")

  await expect(page.getByText("Add your Comfy key").first()).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveCount(0)
})

test("a key the Router has not turned on shows the catalog's message and keeps the agent off", async ({
  page,
}) => {
  await openAgent(page, {
    models: [],
    model: null,
    refusal: { code: "ENGINE_NOT_ENABLED", status: 412 },
  })

  await expect(
    page.getByText("Comfy has not turned hosted models on for your account yet")
  ).toBeVisible()
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveCount(0)
})

test("a key the Router takes opens the composer with the agent's model to choose", async ({
  page,
}) => {
  await openAgent(page, {
    models: ["deepseek/deepseek-v4-flash", "qwen/qwen3.6-flash"],
    model: "deepseek/deepseek-v4-flash",
    refusal: null,
  })

  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Model Deepseek V4 Flash" })
  ).toBeVisible()
})
