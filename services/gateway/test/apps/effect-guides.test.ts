import { fileURLToPath } from "node:url"
import { readApps } from "@rosesfield/catalog"
import {
  type EffectPreset,
  effectsApp,
  heldEffectPresets,
} from "@rosesfield/catalog/effects"
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
import { folderGuideFiles } from "#effect-guides/folder-guide-files"
import type { GuideFiles } from "#effect-guides/guide-files"
import { sha256Of } from "#effect-guides/guided-start-run"
import { pngOf, readRun, upload } from "../fixtures/effects-gateway"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const guideFolder = fileURLToPath(
  new URL("../../../../apps/platform/public/effects/guides", import.meta.url)
)

const shippedGuides = folderGuideFiles(guideFolder)

const runId = "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e"

const clipEffect: EffectPreset = {
  id: "clip-fixture",
  kind: "clip",
  adapter: {
    file: "ltx-2.3-22b-ic-lora-day-to-night-0.9.safetensors",
    strength: 1,
  },
  prompt: "A realistic nighttime scene of the same place.",
  negative: "pitch black",
  result: { runId, file: "clip-fixture.mp4" },
}

const keptEffects: readonly EffectPreset[] = [
  ...heldEffectPresets.map((preset) => ({
    ...preset,
    result: { runId, file: `${preset.id}.mp4` },
  })),
  clipEffect,
]

function parsedEffects(): AppDefinition {
  const [one] = readApps([
    { folder: "effects", app: effectsApp([], keptEffects) },
  ])
  if (one === undefined) {
    throw new Error("The effects app did not parse")
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
    apps: [parsedEffects()],
    portsFor: (clock, folder) => ({ ...localPorts(clock, folder), guides }),
  })
  open.push(harness)
  return harness
}

function start(gateway: Harness, inputs: Record<string, unknown>) {
  return gateway.call(
    buildPath(routes.startRun.path, { appId: "effects" }),
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

describe("an effect on a guide through the gateway", () => {
  it("adds the effect's guide to the run once, and the run follows it on the demo engine", async () => {
    const gateway = gatewayWith(shippedGuides)
    const photo = await upload(gateway, pngOf(1080, 1920))
    const first = await started(gateway, {
      effect: "grab-and-run",
      image: [photo],
    })
    const second = await started(gateway, {
      effect: "grab-and-run",
      image: [photo],
    })
    expect(first.inputs).toMatchObject({
      effect: "grab-and-run",
      image: [photo],
    })
    expect(first.inputs.guide).toHaveLength(1)
    expect(second.inputs.guide).toEqual(first.inputs.guide)
    expect(await videosIn(gateway)).toBe(1)
    await gateway.drive(first.id)
    expect((await readRun(gateway, first.id)).status).toBe("done")
  })

  it("sets the effect's own guide over a guide the caller gave", async () => {
    const gateway = gatewayWith(shippedGuides)
    const photo = await upload(gateway, pngOf(1080, 1920))
    const other = await upload(gateway, new Uint8Array(64), "video/mp4")
    const run = await started(gateway, {
      effect: "flip-into-a-new-place",
      image: [photo],
      guide: [other],
    })
    expect(run.inputs.guide).not.toEqual([other])
  })

  it("refuses a guide whose bytes differ from the effect's sha256", async () => {
    const gateway = gatewayWith({ read: async () => new Uint8Array(172_490) })
    const photo = await upload(gateway, pngOf(1080, 1920))
    const response = await start(gateway, {
      effect: "flip-into-a-new-place",
      image: [photo],
    })
    expect(response.status).toBe(502)
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "EFFECT_GUIDE_UNREADABLE"
    )
    expect(gateway.jobs.enqueued).toEqual([])
  })

  it("refuses a run when the server serves no guide", async () => {
    const gateway = gatewayWith({ read: async () => null })
    const photo = await upload(gateway, pngOf(1080, 1920))
    const response = await start(gateway, {
      effect: "ticket-wipe",
      image: [photo],
    })
    expect(errorEnvelope.parse(await response.json()).error.code).toBe(
      "EFFECT_GUIDE_UNREADABLE"
    )
  })
})

describe("an effect on your clip through the gateway", () => {
  it("runs on your clip with no guide", async () => {
    const gateway = gatewayWith({ read: async () => null })
    const clip = await upload(gateway, new Uint8Array(64), "video/mp4")
    const run = await started(gateway, { effect: "clip-fixture", clip: [clip] })
    expect(run.inputs).toEqual({
      effect: "clip-fixture",
      clip: [clip],
      resolution: "720p",
    })
  })
})

describe("the shipped guides", () => {
  it.each(
    heldEffectPresets.flatMap((preset) =>
      preset.kind === "photo" ? [preset.guide] : []
    )
  )("$file matches its recorded size and sha256", async (guide) => {
    const bytes = await shippedGuides.read(guide.file)
    expect(bytes?.length).toBe(guide.bytes)
    expect(bytes === null ? null : await sha256Of(bytes)).toBe(guide.sha256)
  })
})
