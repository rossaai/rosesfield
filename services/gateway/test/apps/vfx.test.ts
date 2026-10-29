import { fileURLToPath } from "node:url"
import { readApps } from "@rosesfield/catalog"
import { offeredPresets, vfxApp } from "@rosesfield/catalog/vfx"
import {
  type AppDefinition,
  assetPageResponse,
  buildPath,
  errorEnvelope,
  type Run,
  routes,
  runResponse,
} from "@rosesfield/contract"
import { afterEach, describe, expect, it } from "vitest"
import { folderGuideFiles } from "#vfx/folder-guide-files"
import type { GuideFiles } from "#vfx/guide-files"
import { sha256Of } from "#vfx/guided-start-run"
import { pngOf, readRun, upload } from "../fixtures/effects-gateway"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const guideFolder = fileURLToPath(
  new URL("../../../../apps/platform/public/vfx/guides", import.meta.url)
)

const shippedGuides = folderGuideFiles(guideFolder)

function parsedVfx(): AppDefinition {
  const [one] = readApps([{ folder: "vfx", app: vfxApp(offeredPresets) }])
  if (one === undefined) {
    throw new Error("The vfx app did not parse")
  }
  return one
}

const open: Harness[] = []

afterEach(() => {
  for (const harness of open.splice(0)) {
    harness.close()
  }
})

function gatewayWith(guides: GuideFiles): Harness {
  const harness = harnessFor({
    apps: [parsedVfx()],
    portsFor: (clock, folder) => ({ ...localPorts(clock, folder), guides }),
  })
  open.push(harness)
  return harness
}

function start(gateway: Harness, inputs: Record<string, unknown>) {
  return gateway.call(
    buildPath(routes.startRun.path, { appId: "vfx" }),
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
  const response = await gateway.call(`${routes.listAssets.path}?kind=video`)
  return assetPageResponse.parse(await response.json()).assets.length
}

describe("a VFX photo preset through the gateway", () => {
  it("adds the preset's guide to the run once, and the run follows it on the demo engine", async () => {
    const gateway = gatewayWith(shippedGuides)
    const photo = await upload(gateway, pngOf(1080, 1920))
    const first = await started(gateway, {
      preset: "grab-and-run",
      photo: [photo],
    })
    const second = await started(gateway, {
      preset: "grab-and-run",
      photo: [photo],
    })
    expect(first.inputs).toMatchObject({
      preset: "grab-and-run",
      photo: [photo],
      resolution: "480p",
    })
    expect(first.inputs.guide).toHaveLength(1)
    expect(second.inputs.guide).toEqual(first.inputs.guide)
    expect(await videosIn(gateway)).toBe(1)
    await gateway.drive(first.id)
    expect((await readRun(gateway, first.id)).status).toBe("done")
  })

  it("sets the preset's own guide over a guide the caller gave", async () => {
    const gateway = gatewayWith(shippedGuides)
    const photo = await upload(gateway, pngOf(1080, 1920))
    const other = await upload(gateway, new Uint8Array(64), "video/mp4")
    const run = await started(gateway, {
      preset: "flip-into-a-new-place",
      photo: [photo],
      guide: [other],
    })
    expect(run.inputs.guide).not.toEqual([other])
  })

  it("refuses a guide whose bytes differ from the preset's sha256", async () => {
    const gateway = gatewayWith({ read: async () => new Uint8Array(172_490) })
    const photo = await upload(gateway, pngOf(1080, 1920))
    const response = await start(gateway, {
      preset: "flip-into-a-new-place",
      photo: [photo],
    })
    expect(response.status).toBe(502)
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "VFX_GUIDE_UNREADABLE"
    )
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses a run when the server serves no guide", async () => {
    const gateway = gatewayWith({ read: async () => null })
    const photo = await upload(gateway, pngOf(1080, 1920))
    const response = await start(gateway, {
      preset: "ticket-wipe",
      photo: [photo],
    })
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "VFX_GUIDE_UNREADABLE"
    )
  })
})

describe("a VFX clip preset through the gateway", () => {
  it("runs on your clip with no guide", async () => {
    const gateway = gatewayWith({ read: async () => null })
    const clip = await upload(gateway, new Uint8Array(64), "video/mp4")
    const run = await started(gateway, { preset: "vanish", clip: [clip] })
    expect(run.inputs).toEqual({
      preset: "vanish",
      clip: [clip],
      resolution: "480p",
    })
  })
})

describe("the shipped guides", () => {
  it.each(
    offeredPresets.flatMap((preset) =>
      preset.kind === "photo" ? [preset.guide] : []
    )
  )("$file matches its recorded size and sha256", async (guide) => {
    const bytes = await shippedGuides.read(guide.file)
    expect(bytes?.length).toBe(guide.bytes)
    expect(bytes === null ? null : await sha256Of(bytes)).toBe(guide.sha256)
  })
})
