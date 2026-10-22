import { expect, type Locator, type Page, test } from "@playwright/test"

const gatewayOrigin = "http://127.0.0.1:8797"
const gutter = 16
const ink = "rgb(12, 10, 7)"
const bugText = "rgb(181, 0, 66)"

type Box = { x: number; y: number; width: number; height: number }

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error("the element has no box")
  }
  return box
}

async function fill(locator: Locator): Promise<string> {
  return locator.evaluate((element) => getComputedStyle(element).background)
}

async function startDemo(app: string, inputs: object): Promise<string> {
  const started = await fetch(`${gatewayOrigin}/api/apps/${app}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs }),
  })
  const body: { run: { id: string } } = await started.json()
  let outputs: string[] = []
  await expect
    .poll(async () => {
      const read = await fetch(`${gatewayOrigin}/api/runs/${body.run.id}`)
      const answer: { run: { status: string; outputs: string[] } } =
        await read.json()
      outputs = answer.run.outputs
      return answer.run.status
    })
    .toBe("done")
  const first = outputs[0]
  if (first === undefined) {
    throw new Error("the demo run made no output")
  }
  return first
}

async function open(page: Page, path: string): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(path)
  await page.waitForLoadState("networkidle")
  await expect(page.locator("[data-slot=viewer-video] video")).toBeVisible()
}

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 768
}

let videoAsset = ""
let imageAsset = ""

test.beforeAll(async () => {
  videoAsset = await startDemo("video", {
    model: "minimax/minimax-h3",
    prompt: "a paper boat drifts on a pond",
    ratio: "16:9",
    resolution: "768P",
    duration: 5,
  })
  imageAsset = await startDemo("image", {
    model: "z-image-turbo",
    prompt: "a paper boat on a pond",
    resolution: "1k",
  })
})

function crosses(arrow: Box, picture: Box): boolean {
  const edges = [picture.x, picture.x + picture.width]
  return edges.some((edge) => arrow.x < edge && edge < arrow.x + arrow.width)
}

test("the step arrows never cross the video's edge on a desktop", async ({
  page,
}) => {
  test.skip(isPhone(page), "the arrows are measured beside the panel at 1440")
  await open(page, `/history?view=${videoAsset}`)
  const picture = await boxOf(page.locator("[data-slot=viewer-video] video"))
  const arrows = page.getByRole("button", { name: /^(Next|Previous)/ })
  await expect(arrows.first()).toBeVisible()
  for (const arrow of await arrows.all()) {
    expect(crosses(await boxOf(arrow), picture)).toBe(false)
  }
})

test("on a phone the image keeps the 16 px gutter at each side", async ({
  page,
}) => {
  test.skip(!isPhone(page), "the gutter is measured at 390 px")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(`/history?view=${imageAsset}`)
  const picture = page.locator("[data-slot=viewer-frame] img")
  await expect(picture).toBeVisible()
  const width = page.viewportSize()?.width ?? 0
  const box = await boxOf(picture)
  expect(box.x).toBe(gutter)
  expect(width - (box.x + box.width)).toBe(gutter)
})

test("the viewer centres a 16:9 picture alone between the gutter and the panel, with its control row under it", async ({
  page,
}) => {
  test.skip(isPhone(page), "the reference measures the stage at 1440")
  await open(page, "/gallery?entry=ref-media-viewer&state=open")
  const picture = await boxOf(page.locator("[data-slot=viewer-video] video"))
  const row = await boxOf(page.locator("[data-slot=viewer-controls]"))
  const aside = await boxOf(page.locator("[data-slot=viewer-aside]"))

  expect(1440 - (aside.x + aside.width)).toBe(7)
  expect(picture.x).toBe(gutter)
  expect(picture.width).toBe(aside.x - 2 * gutter)
  expect(Math.abs(picture.y + picture.height / 2 - 450)).toBeLessThanOrEqual(1)
  expect(Math.abs(row.y - (picture.y + picture.height))).toBeLessThanOrEqual(1)
})

test("the control row carries a volume track beside the speaker", async ({
  page,
}) => {
  test.skip(isPhone(page), "one width proves the row")
  await open(page, "/gallery?entry=ref-media-viewer&state=open")
  const row = page.locator("[data-slot=viewer-controls]")
  const speaker = await boxOf(
    row.getByRole("button", { name: "Turn the sound on" })
  )
  const tracks = row.locator("[data-slot=slider]")
  await expect(tracks).toHaveCount(2)
  const volume = await boxOf(tracks.nth(1))
  const fullScreen = await boxOf(
    row.getByRole("button", { name: "Full screen" })
  )

  expect(volume.width).toBe(80)
  expect(volume.x).toBeGreaterThan(speaker.x + speaker.width)
  expect(volume.x - (speaker.x + speaker.width)).toBeLessThanOrEqual(8)
  expect(fullScreen.x).toBeGreaterThan(volume.x + volume.width)
})

test("the input strip cuts its last visible tile at the clip edge", async ({
  page,
}) => {
  test.skip(isPhone(page), "the panel shows the strip at 1440")
  await open(page, "/gallery?entry=ref-media-viewer&state=open")
  const strip = await page.evaluate(() => {
    const scroller = document.querySelector("[data-slot=viewer-input-strip]")
    const tile = scroller?.querySelector("[data-slot=viewer-input]")
    if (!scroller || !tile) {
      return null
    }
    for (let index = 0; index < 5; index += 1) {
      scroller.appendChild(tile.cloneNode(true))
    }
    const edge = scroller.getBoundingClientRect().x + scroller.clientWidth
    const lefts = [...scroller.querySelectorAll("[data-slot=viewer-input]")]
      .map((one) => one.getBoundingClientRect())
      .map((rect) => ({ left: rect.x, right: rect.x + rect.width }))
    return {
      scrolls: scroller.scrollWidth > scroller.clientWidth,
      cut: lefts.filter((one) => one.left < edge && one.right > edge),
      pitch: (lefts[1]?.left ?? 0) - (lefts[0]?.left ?? 0),
    }
  })

  expect(strip?.scrolls).toBe(true)
  expect(strip?.pitch).toBe(76)
  expect(strip?.cut).toHaveLength(1)
})

test("Recreate is the one filled action over Download, Use in and More, a workflow run's Open in ComfyUI sits at the foot, and Delete waits in More in error red behind a confirm", async ({
  page,
}) => {
  test.skip(isPhone(page), "the phone bar is proven on its own")
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(`/history?view=${imageAsset}`)
  await expect(page.locator("[data-slot=viewer-frame] img")).toBeVisible()
  const aside = page.getByRole("dialog").locator("aside")
  const panel = await boxOf(aside)
  const recreate = aside.getByRole("button", { name: "Recreate" })
  const download = await boxOf(aside.getByRole("button", { name: "Download" }))
  const useIn = await boxOf(aside.getByRole("button", { name: "Use in" }))
  const more = aside.getByRole("button", { name: "More" })
  const comfy = aside.getByRole("button", { name: "Open in ComfyUI" })
  const comfyBox = await boxOf(comfy)

  expect(await fill(recreate)).toContain(ink)
  expect(download.y).toBe(useIn.y)
  expect(download.width).toBe(useIn.width)
  expect(download.y).toBeGreaterThan((await boxOf(recreate)).y)
  expect((await boxOf(more)).y).toBe(download.y)
  expect(comfyBox.y).toBeGreaterThan(download.y)
  expect(await fill(comfy)).not.toContain(ink)
  await expect(comfy.locator("svg, img").first()).toBeVisible()
  expect(panel.y + panel.height - (comfyBox.y + comfyBox.height)).toBe(13)
  await expect(aside.getByRole("button", { name: "Delete" })).toHaveCount(0)
  const filled = await aside
    .getByRole("button")
    .evaluateAll(
      (buttons, color) =>
        buttons.filter((one) =>
          getComputedStyle(one).background.includes(color)
        ).length,
      ink
    )
  expect(filled).toBe(1)
  await more.click()
  const remove = page.getByRole("menuitem", { name: "Delete" })
  await expect(remove).toHaveCSS("color", bugText)
  await remove.click()
  const confirm = page.getByRole("alertdialog")
  await expect(confirm).toBeVisible()
  await expect(confirm.getByRole("button", { name: "Delete" })).toHaveCSS(
    "color",
    bugText
  )
  await confirm.getByRole("button", { name: "Cancel" }).click()
  await expect(confirm).toBeHidden()
})

test("on a phone the video keeps its gutter and Recreate stays on the screen", async ({
  page,
}) => {
  test.skip(!isPhone(page), "the phone bar shows under 768 px")
  await open(page, `/history?view=${videoAsset}`)
  const width = page.viewportSize()?.width ?? 0
  const picture = await boxOf(page.locator("[data-slot=viewer-video] video"))
  const row = await boxOf(page.locator("[data-slot=viewer-controls]"))
  const bar = page.locator("[data-slot=viewer-bar]")
  const recreate = bar.getByRole("button", { name: "Recreate" })

  expect(picture.x).toBe(gutter)
  expect(width - (picture.x + picture.width)).toBe(gutter)
  expect(row.x).toBe(gutter)
  expect(width - (row.x + row.width)).toBe(gutter)
  const tracks = page.locator("[data-slot=viewer-controls] [data-slot=slider]")
  await expect(tracks).toHaveCount(1)
  expect((await boxOf(tracks.first())).width).toBeGreaterThanOrEqual(
    row.width / 2
  )
  await expect(recreate).toBeVisible()
  expect(await fill(recreate)).toContain(ink)
  expect(
    await fill(bar.getByRole("button", { name: "Download" }))
  ).not.toContain(ink)
})
