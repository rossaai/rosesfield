import { expect, type Locator, type Page, test } from "@playwright/test"

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

test("with no Comfy key the agent still offers its composer", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto("/agent")

  await expect(page.getByRole("textbox", { name: "Message" })).toBeVisible()
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

const flash = "deepseek/deepseek-v4-flash"

const flashDetail = {
  name: "DeepSeek V4 Flash",
  lab: "deepseek",
  facts: {
    lab: null,
    release: null,
    weights: null,
    lineKey: null,
    scores: {},
  },
  context: 131_072,
  inputs: [],
  input: 21.1,
  output: 84.4,
  effort: "high",
  efforts: ["high", "low"],
  messages: [
    { effort: "high", credits: 1.7147 },
    { effort: "low", credits: 0.4702 },
  ],
}

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("The element has no box")
  }
  return box
}

test("on a phone the composer reads as a phone composer: the field across the top, then the chips with their words and Send in one row", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "the phone layout")
  await openAgent(page, {
    models: [flash, "qwen/qwen3.6-flash"],
    model: flash,
    refusal: null,
    details: { [flash]: flashDetail },
  })
  const bar = page.locator("[data-bar='prompt']")
  const field = bar.getByRole("textbox", { name: "Message" })
  await expect(field).toBeVisible()
  const composer = await boxOf(bar)
  const fieldBox = await boxOf(field)
  expect(fieldBox.width).toBeGreaterThanOrEqual(composer.width - 26)

  const row = bar.locator("[data-slot='chip-row']")
  const toolbar = await boxOf(bar.locator("[data-slot='composer-toolbar']"))
  expect(toolbar.y).toBeGreaterThan(fieldBox.y)
  const send = bar.getByRole("button", { name: "Send", exact: true })
  await expect(send).toBeVisible()
  const sendBox = await boxOf(send)
  expect(sendBox.width).toBe(sendBox.height)
  expect(sendBox.x + sendBox.width).toBeLessThanOrEqual(
    composer.x + composer.width
  )
  const sendMiddle = sendBox.y + sendBox.height / 2
  expect(sendMiddle).toBeGreaterThan(toolbar.y)
  expect(sendMiddle).toBeLessThan(toolbar.y + toolbar.height)
  expect(sendBox.x).toBeGreaterThanOrEqual(toolbar.x + toolbar.width)

  const gutter = await row.evaluate(
    (element: HTMLElement) => element.offsetHeight - element.clientHeight
  )
  expect(gutter).toBe(0)
  const chips = [
    { chip: bar.getByRole("combobox", { name: "Effort" }), words: "High" },
    { chip: bar.getByRole("combobox", { name: "Run mode" }), words: "Auto" },
    {
      chip: bar.getByRole("button", { name: /^Model Deepseek V4 Flash$/i }),
      words: "DeepSeek V4 Flash",
    },
  ]
  for (const { chip, words } of chips) {
    await chip.scrollIntoViewIfNeeded()
    await expect(chip.getByText(words, { exact: true })).toBeVisible()
    const shown = await boxOf(row)
    const box = await boxOf(chip)
    expect(box.x).toBeGreaterThanOrEqual(shown.x - 1)
    expect(box.x + box.width).toBeLessThanOrEqual(shown.x + shown.width + 1)
  }
})

test("an agent row ends with one message's whole credits at the chosen effort, never under 1, and its caption starts with text", async ({
  page,
}) => {
  await openAgent(page, {
    models: [flash],
    model: flash,
    refusal: null,
    details: { [flash]: flashDetail },
  })
  const bar = page.locator("[data-bar='prompt']")
  const model = bar.getByRole("button", { name: /^Model Deepseek V4 Flash$/i })
  const row = page.locator("[data-slot='model-row']").filter({
    has: page.locator(`[data-model='${flash}']`),
  })
  const price = row.first().locator("[data-slot='credit-price']")
  await model.click()
  await expect(price).toHaveText("2")
  await expect(row.first()).not.toContainText("Reasons")
  await expect(
    row.first().locator("[data-slot='model-row-capability'] svg").first()
  ).toHaveClass(/lucide-type/)
  await expect(
    row.first().locator("[data-slot='model-row-price-note']")
  ).toHaveAttribute(
    "aria-label",
    "2 Comfy credits per message, estimated. 22 per 1M in, 85 per 1M out"
  )
  await page.keyboard.press("Escape")

  const effort = bar.getByRole("combobox", { name: "Effort" })
  await effort.scrollIntoViewIfNeeded()
  await effort.click()
  await page.getByRole("option", { name: "Low" }).click()
  await expect(effort).toContainText("Low")
  await model.scrollIntoViewIfNeeded()
  await model.click()
  await expect(price).toHaveText("1")
})

test("on a phone the empty agent screen centers its heading in the space between the header and the composer", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "phone", "the phone layout")
  await openAgent(page, {
    models: [flash, "qwen/qwen3.6-flash"],
    model: flash,
    refusal: null,
    details: { [flash]: flashDetail },
  })
  const bar = page.locator("[data-bar='prompt']")
  await expect(bar.getByRole("textbox", { name: "Message" })).toBeVisible()
  const block = page.locator("[data-slot='agent-start-heading']")
  await expect(
    block.getByRole("heading", { name: "What should the agent make?" })
  ).toBeVisible()
  const space = await block.evaluate((element) => {
    const parent = element.parentElement
    if (parent === null) {
      throw new Error("The heading has no space")
    }
    const box = parent.getBoundingClientRect()
    return { top: box.top, bottom: box.bottom }
  })
  const composer = await boxOf(bar)
  expect(space.bottom - (composer.y + composer.height)).toBeLessThanOrEqual(24)
  const heading = await boxOf(block)
  const free = (space.top + composer.y) / 2
  expect(Math.abs(heading.y + heading.height / 2 - free)).toBeLessThanOrEqual(8)
})

function chatDetailOf(
  name: string,
  rank: number | null,
  tiers: readonly string[]
): unknown {
  return {
    ...flashDetail,
    name,
    effort: null,
    efforts: [],
    messages: [{ effort: null, credits: 1 }],
    facts: {
      ...flashDetail.facts,
      scores: {
        chat: {
          score: rank === null ? null : 90,
          rank,
          order: rank ?? 9,
          of: 274,
          sources: [],
          tiers,
        },
      },
    },
  }
}

test("the agent's picker shows Featured, the #1 and then the Best value models, above All models, and Auto shows the zap", async ({
  page,
}) => {
  const listed = ["lab/top", "lab/second", "lab/value", "lab/later-value"]
  await openAgent(page, {
    models: listed,
    model: "lab/second",
    refusal: null,
    details: {
      "lab/top": chatDetailOf("Top", 1, []),
      "lab/second": chatDetailOf("Second", 2, []),
      "lab/value": chatDetailOf("Value", 3, ["bestValue"]),
      "lab/later-value": chatDetailOf("Later Value", 4, ["bestValue"]),
    },
  })
  const bar = page.locator("[data-bar='prompt']")
  const mode = bar.getByRole("combobox", { name: "Run mode" })
  await expect(mode).toContainText("Auto")
  await expect(mode.locator("svg").first()).toHaveClass(/lucide-zap/)
  await bar.getByRole("button", { name: /^Model Second$/ }).click()
  const listbox = page.locator("[role='listbox']")
  await expect(listbox.locator("[data-slot='model-list-label']")).toHaveText([
    "Featured",
    "All models",
  ])
  await expect(listbox).not.toContainText("Recent")
  const idsOf = (section: string): Promise<string[]> =>
    listbox
      .locator(`[data-section='${section}'] [role='option']`)
      .evaluateAll((rows) =>
        rows.map((row) => row.getAttribute("data-model") ?? "")
      )
  expect(await idsOf("featured")).toEqual([
    "lab/top",
    "lab/value",
    "lab/later-value",
  ])
  expect(await idsOf("all")).toEqual(listed)
})
