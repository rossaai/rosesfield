import { fileURLToPath } from "node:url"
import { readApps } from "@rosesfield/catalog"
import {
  approvedExamples,
  exampleOf,
  type LibraryExample,
  libraryExamples,
  motionApp,
  offeredMotionApp,
} from "@rosesfield/catalog/motion"
import {
  type AppDefinition,
  assetPageResponse,
  buildPath,
  type Run,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { folderGuideFiles } from "#effect-guides/folder-guide-files"
import { guideEngineFiles, sha256Of } from "#effect-guides/guide-engine-files"
import { mcp, pngOf, readRun, upload } from "../fixtures/examples-gateway"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const guideFolder = fileURLToPath(
  new URL("../../src/effect-guides/files", import.meta.url)
)

const shippedGuides = folderGuideFiles(guideFolder)

function approvedLook(id: string): LibraryExample {
  const [approved] = approvedExamples
  if (approved === undefined) {
    throw new Error("No example is approved")
  }
  return {
    ...exampleOf(id),
    approved: true,
    approval: approved.approval,
    preview: approved.preview,
  }
}

function parsedMotion(recipes: readonly LibraryExample[]): AppDefinition {
  const [one] = readApps([{ folder: "motion", app: motionApp(recipes) }])
  if (one === undefined) {
    throw new Error("The Motion app did not parse")
  }
  return one
}

const open: Harness[] = []

afterEach(() => {
  for (const harness of open.splice(0)) {
    harness.close()
  }
})

function gatewayWith(recipes: readonly LibraryExample[]): Harness {
  const harness = harnessFor({
    apps: [parsedMotion(recipes)],
    portsFor: localPorts,
  })
  open.push(harness)
  return harness
}

function start(gateway: Harness, inputs: Record<string, unknown>) {
  return gateway.call(
    buildPath(routes.startRun.path, { appId: "motion" }),
    jsonInit(
      { inputs, aspectRatio: "9:16" },
      { "Idempotency-Key": crypto.randomUUID() }
    )
  )
}

async function started(
  gateway: Harness,
  inputs: Record<string, unknown>
): Promise<Run> {
  const response = await start(gateway, inputs)
  expect(response.status).toBe(202)
  return runResponse.parse(await response.json()).run
}

async function videosIn(gateway: Harness): Promise<number> {
  let count = 0
  let cursor: string | null = null
  do {
    const query: string =
      cursor === null ? "?kind=video" : `?kind=video&cursor=${cursor}`
    const response = await gateway.call(`${routes.listAssets.path}${query}`)
    const page = assetPageResponse.parse(await response.json())
    count += page.assets.length
    cursor = page.next
  } while (cursor !== null)
  return count
}

describe("an example that follows a guide, through the gateway", () => {
  it("runs on your photo alone and writes no guide to the library or the run", async () => {
    const gateway = gatewayWith([approvedLook("grab-and-run")])
    const photo = await upload(gateway, pngOf(1080, 1920))
    const run = await started(gateway, {
      example: "grab-and-run",
      photo: [photo],
    })
    expect(Object.keys(run.inputs).sort()).toEqual([
      "endKey",
      "example",
      "mask",
      "model",
      "photo",
      "resolution",
    ])
    expect(run.inputs).toMatchObject({ endKey: [], mask: [] })
    expect(run.inputs).not.toHaveProperty("guide")
    expect(await videosIn(gateway)).toBe(0)
    await gateway.drive(run.id)
    expect((await readRun(gateway, run.id)).status).toBe("done")
    expect(await videosIn(gateway)).toBe(1)
  })

  it("writes nothing for an example the operator has not approved", async () => {
    const gateway = gatewayWith([])
    const photo = await upload(gateway, pngOf(1080, 1920))
    const response = await start(gateway, {
      example: "ticket-wipe",
      photo: [photo],
    })
    expect(response.status).toBe(400)
    expect(gateway.jobs.enqueued).toEqual([])
    expect(await videosIn(gateway)).toBe(0)
  })

  it("adds no guide to a library that already holds more than 60 videos", async () => {
    const gateway = gatewayWith([approvedLook("ticket-wipe")])
    for (let at = 0; at < 61; at += 1) {
      await upload(gateway, new Uint8Array([at, 1, 2, 3]), "video/mp4")
    }
    const photo = await upload(gateway, pngOf(1920, 1408))
    await started(gateway, { example: "ticket-wipe", photo: [photo] })
    await started(gateway, { example: "ticket-wipe", photo: [photo] })
    expect(await videosIn(gateway)).toBe(61)
  })
})

describe("the examples Motion's MCP tool lists", () => {
  it("holds only the approved examples behind an owner token", async () => {
    const harness = harnessFor({
      apps: [
        offeredMotionApp(libraryExamples, { mode: "owner", lock: "token" }),
      ],
      portsFor: localPorts,
    })
    open.push(harness)
    const listed = JSON.stringify(await mcp(harness, "tools/list", {}))
    expect(listed).toContain("grab-and-run")
    for (const id of ["flip-into-a-new-place", "ticket-wipe", "many-copies"]) {
      expect(listed).not.toContain(id)
    }
  })

  it("holds the examples not yet approved too on a server that answers only on this computer, the control", async () => {
    const harness = harnessFor({
      apps: [
        offeredMotionApp(libraryExamples, { mode: "owner", lock: "local" }),
      ],
      portsFor: localPorts,
    })
    open.push(harness)
    const listed = JSON.stringify(await mcp(harness, "tools/list", {}))
    expect(listed).toContain("ticket-wipe")
  })
})

describe("the guides the engine holds", () => {
  const guided = libraryExamples.flatMap((example) =>
    example.guide === null ? [] : [example.guide]
  )

  it.each(guided)(
    "finds $file by its name and its sha256, with no library",
    async (guide) => {
      const held = await guideEngineFiles(shippedGuides).read(guide.file)
      expect(held?.mime).toBe("video/mp4")
      expect(held?.bytes.length).toBe(guide.bytes)
      expect(held === null ? null : await sha256Of(held.bytes)).toBe(
        guide.sha256
      )
    }
  )

  it("serves no file whose bytes differ from the recorded sha256", async () => {
    const files = guideEngineFiles({
      read: async () => new Uint8Array(172_490),
    })
    expect(await files.read("flip-into-a-new-place.mp4")).toBeNull()
  })

  it("serves no file no example records", async () => {
    const files = guideEngineFiles(shippedGuides)
    expect(await files.read("another.mp4")).toBeNull()
  })
})
