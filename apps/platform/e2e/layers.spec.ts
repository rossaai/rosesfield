import { readFileSync } from "node:fs"
import { expect, type Page, test } from "@playwright/test"

const gatewayOrigin = "http://127.0.0.1:8797"
const photoPath = new URL(
  "../src/gallery/fixtures/demo-image-16-9.png",
  import.meta.url
).pathname

async function uploadPhoto(): Promise<string> {
  const uploaded = await fetch(`${gatewayOrigin}/api/assets`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: readFileSync(photoPath),
  })
  const body: { asset: { id: string } } = await uploaded.json()
  return body.asset.id
}

async function splitOf(
  source: string
): Promise<{ id: string; first: string }> {
  const started = await fetch(`${gatewayOrigin}/api/apps/layers/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputs: { source: [source], count: "2" } }),
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
    throw new Error("the demo split made no layer")
  }
  return { id: body.run.id, first }
}

async function open(page: Page, path: string): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("rosesfield.welcome", "seen")
  })
  await page.goto(path)
}

function isPhone(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 768
}

function sourceTile(page: Page) {
  return page
    .locator("[data-slot='drop-well']")
    .getByRole("button", { name: "Remove" })
}

test("Recreate on a split run in History fills the image and shows that run's stack", async ({
  page,
}) => {
  const split = await splitOf(await uploadPhoto())
  await open(page, `/history?view=${split.first}`)
  await page.getByRole("button", { name: "Recreate" }).first().click()
  await expect(page).toHaveURL(new RegExp(`/apps/layers\\?from=${split.id}`))
  await expect(
    page.getByRole("list", { name: "Layers of this run" }).first()
  ).toBeVisible()
  if (!isPhone(page)) {
    await expect(sourceTile(page)).toHaveCount(1)
    await expect(page.getByRole("radio", { name: "Split" })).toBeChecked()
  }
})

test("Use in Layers from the library opens Layers in Split with that image", async ({
  page,
}) => {
  const photo = await uploadPhoto()
  await open(page, `/library?view=${photo}`)
  await page.getByRole("button", { name: "Use in" }).click()
  await page.getByRole("menuitem", { name: "Layers", exact: true }).click()
  await expect(page).toHaveURL(new RegExp(`/apps/layers\\?use=${photo}`))
  if (!isPhone(page)) {
    await expect(sourceTile(page)).toHaveCount(1)
    await expect(page.getByRole("radio", { name: "Split" })).toBeChecked()
  }
})
