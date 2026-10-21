import { expect, type Page, test } from "@playwright/test"

const gatewayOrigin = "http://127.0.0.1:8797"

type Choice = {
  name: string
  default?: string
  options?: Array<{ value: string }>
}

type Listing = { id: string; inputs: Choice[] }

type RunRead = {
  run: {
    status: string
    count: number
    outputs: string[]
    inputs: Record<string, unknown>
  }
}

type OpenedFile = { type: string; width: number; height: number }

async function listing(id: string): Promise<Listing> {
  const listed = await fetch(`${gatewayOrigin}/api/apps`)
  const body: { apps: Listing[] } = await listed.json()
  const found = body.apps.find((app) => app.id === id)
  if (found === undefined) {
    throw new Error(`the gateway lists no ${id} app`)
  }
  return found
}

function modelOf(app: Listing): Choice {
  const model = app.inputs.find((input) => input.name === "model")
  if (model === undefined) {
    throw new Error(`${app.id} has no model input`)
  }
  return model
}

async function finishedRun(body: unknown): Promise<RunRead["run"]> {
  const started = await fetch(`${gatewayOrigin}/api/apps/characters/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  })
  expect(started.status).toBe(202)
  const queued: { run: { id: string } } = await started.json()
  const readRun = async (): Promise<RunRead["run"]> => {
    const answer = await fetch(`${gatewayOrigin}/api/runs/${queued.run.id}`)
    const body: RunRead = await answer.json()
    return body.run
  }
  await expect.poll(async () => (await readRun()).status).toBe("done")
  return readRun()
}

async function openedFile(page: Page, assetId: string): Promise<OpenedFile> {
  return page.evaluate(async (id) => {
    const answer = await fetch(`/api/assets/${id}/content`)
    const file = await answer.blob()
    const image = await createImageBitmap(file)
    return { type: file.type, width: image.width, height: image.height }
  }, assetId)
}

async function expectImages(
  page: Page,
  assetIds: readonly string[],
  ratio: number | null
): Promise<void> {
  for (const assetId of assetIds) {
    const file = await openedFile(page, assetId)
    expect(file.type).toMatch(/^image\//)
    expect(file.width).toBeGreaterThan(0)
    expect(file.height).toBeGreaterThan(0)
    if (ratio !== null) {
      expect(Math.abs(file.width / file.height / ratio - 1)).toBeLessThan(
        0.02
      )
    }
  }
}

test.describe("Characters runs across the wire", () => {
  test("opens on Image's open-weights default and lists no Wan or old traits graph", async () => {
    const characters = modelOf(await listing("characters"))
    const image = modelOf(await listing("image"))
    expect(characters.default).toBe(image.default)
    const values = (characters.options ?? []).map((option) => option.value)
    expect(values).toContain("qwen-image-edit-2511")
    expect(values).not.toContain("flux-2-klein-4b")
    expect(values.filter((value) => /wan/i.test(value))).toEqual([])
  })

  test("makes the chosen count of portraits in the chosen ratio, then 4 views of one, each a file that opens as an image", async ({
    page,
  }) => {
    await page.goto("/")
    const portraits = await finishedRun({
      inputs: { gender: "woman", count: "3" },
      aspectRatio: "3:4",
    })
    expect(portraits.count).toBe(3)
    expect(portraits.outputs).toHaveLength(3)
    await expectImages(page, portraits.outputs, 3 / 4)
    const created = await fetch(`${gatewayOrigin}/api/characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Ana",
        references: [portraits.outputs[0]],
        notes: "",
      }),
    })
    const character: { character: { id: string } } = await created.json()
    const views = await finishedRun({
      inputs: {
        mode: "angles",
        character: [character.character.id],
        angleSet: "turnaround",
      },
    })
    expect(views.count).toBe(4)
    expect(views.outputs).toHaveLength(4)
    expect(views.inputs).toMatchObject({ model: "qwen-image-edit-2511" })
    await expectImages(page, views.outputs, null)
  })
})
