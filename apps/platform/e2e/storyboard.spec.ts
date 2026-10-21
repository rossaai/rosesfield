import { expect, type Page, type Request, test } from "@playwright/test"

const photo = new URL(
  "../src/gallery/fixtures/demo-image-1-1.png",
  import.meta.url
).pathname

const startUrl = /\/api\/apps\/storyboard\/runs$/

type StartBody = { inputs: Record<string, unknown> }

function isStart(request: Request): boolean {
  return request.method() === "POST" && startUrl.test(request.url())
}

function bodyOf(request: Request): StartBody {
  const body: unknown = request.postDataJSON()
  if (typeof body !== "object" || body === null || !("inputs" in body)) {
    throw new Error("a start holds no inputs")
  }
  const { inputs } = body
  if (typeof inputs !== "object" || inputs === null) {
    throw new Error("a start holds no inputs")
  }
  return { inputs: Object.fromEntries(Object.entries(inputs)) }
}

async function writeScenes(page: Page, scenes: readonly string[]) {
  const fields = page.getByPlaceholder("What happens in this scene?")
  for (const [index, scene] of scenes.entries()) {
    if (index > 0) {
      await page.getByRole("button", { name: "Add scene" }).click()
    }
    await fields.nth(index).fill(scene)
  }
}

async function addReference(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /Add an image/ })
    .first()
    .click()
  const chooser = page.waitForEvent("filechooser")
  await page.getByRole("menuitem", { name: "Upload" }).click()
  await (await chooser).setFiles(photo)
  await expect(
    page.locator('[data-slot="drop-well"]').first().locator("img")
  ).toBeVisible()
}

function startsOf(page: Page): Request[] {
  const starts: Request[] = []
  page.on("request", (request) => {
    if (isStart(request)) {
      starts.push(request)
    }
  })
  return starts
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
})

test.describe("Storyboard's keyframes, one run each", () => {
  test.skip(({ isMobile }) => isMobile, "the column shows from 768 px")

  test("with a reference and 3 scenes starts 3 runs at once, shows 3 numbered tiles and replaces each with its keyframe", async ({
    page,
  }) => {
    const starts = startsOf(page)
    await page.goto("/apps/storyboard")
    await addReference(page)
    await writeScenes(page, [
      "a fox wakes in a den",
      "the fox crosses a frozen river",
      "the fox watches the town lights",
    ])
    await page.locator('[data-slot="generate-button"]').click()
    await expect.poll(() => starts.length).toBe(3)
    expect(starts.map((one) => bodyOf(one).inputs.keyframe).sort()).toEqual([
      "1",
      "2",
      "3",
    ])
    const grid = page.locator('[data-slot="keyframe-grid"]').first()
    const tiles = grid.locator("li")
    await expect(tiles).toHaveCount(3)
    await expect(tiles.locator(":scope > span[aria-hidden]")).toHaveText([
      "1",
      "2",
      "3",
    ])
    await expect(grid.locator("img")).toHaveCount(3, { timeout: 30_000 })
  })

  test("with no reference makes keyframe 1 first, then edits keyframe 1 for scene 2", async ({
    page,
  }) => {
    const starts = startsOf(page)
    await page.goto("/apps/storyboard")
    await writeScenes(page, [
      "a lighthouse at dawn",
      "a boat leaves the harbour",
    ])
    await page.locator('[data-slot="generate-button"]').click()
    await expect.poll(() => starts.length).toBe(1)
    const grid = page.locator('[data-slot="keyframe-grid"]').first()
    await expect(grid.locator("li")).toHaveCount(2)
    await expect(grid.locator("li").first().locator("img")).toBeVisible({
      timeout: 30_000,
    })
    await expect.poll(() => starts.length, { timeout: 30_000 }).toBe(2)
    const [first, second] = starts.map(bodyOf)
    expect(first?.inputs).toMatchObject({ keyframe: "1" })
    expect(first?.inputs).not.toHaveProperty("firstKeyframe")
    expect(second?.inputs).toMatchObject({ keyframe: "2" })
    expect(second?.inputs.firstKeyframe).toHaveLength(1)
    await expect(grid.locator("img")).toHaveCount(2, { timeout: 30_000 })
  })
})
