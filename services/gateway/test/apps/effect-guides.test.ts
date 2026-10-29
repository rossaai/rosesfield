import { fileURLToPath } from "node:url"
import { readApps } from "@rosesfield/catalog"
import {
  type EffectRecipe,
  effectRecipes,
  effectsApp,
  offeredEffectsApp,
  passedRecipes,
  recipeOf,
} from "@rosesfield/catalog/effects"
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
import { mcp, pngOf, readRun, upload } from "../fixtures/effects-gateway"
import { type Harness, harnessFor, jsonInit } from "../harness"
import { localPorts } from "../local-ports"

const guideFolder = fileURLToPath(
  new URL("../../../../apps/platform/public/effects/guides", import.meta.url)
)

const shippedGuides = folderGuideFiles(guideFolder)

function passedLook(effect: string): EffectRecipe {
  const [passed] = passedRecipes
  if (passed === undefined) {
    throw new Error("No look passed")
  }
  return {
    ...recipeOf(effect),
    passed: true,
    preview: passed.preview,
    proof: passed.proof,
  }
}

function parsedEffects(recipes: readonly EffectRecipe[]): AppDefinition {
  const [one] = readApps([{ folder: "effects", app: effectsApp(recipes) }])
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

function gatewayWith(recipes: readonly EffectRecipe[]): Harness {
  const harness = harnessFor({
    apps: [parsedEffects(recipes)],
    portsFor: localPorts,
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

describe("a look that follows a guide, through the gateway", () => {
  it("runs on your photo alone and writes no guide to the library or the run", async () => {
    const gateway = gatewayWith([passedLook("grab-and-run")])
    const photo = await upload(gateway, pngOf(1080, 1920))
    const run = await started(gateway, {
      effect: "grab-and-run",
      image: [photo],
    })
    expect(Object.keys(run.inputs).sort()).toEqual([
      "effect",
      "image",
      "resolution",
    ])
    expect(await videosIn(gateway)).toBe(0)
    await gateway.drive(run.id)
    expect((await readRun(gateway, run.id)).status).toBe("done")
    expect(await videosIn(gateway)).toBe(1)
  })

  it("writes nothing for a look no run of which passed", async () => {
    const gateway = gatewayWith(passedRecipes)
    const photo = await upload(gateway, pngOf(1080, 1920))
    const response = await start(gateway, {
      effect: "grab-and-run",
      image: [photo],
    })
    expect(response.status).toBe(400)
    expect(gateway.jobs.enqueued).toEqual([])
    expect(await videosIn(gateway)).toBe(0)
  })

  it("adds no guide to a library that already holds more than 60 videos", async () => {
    const gateway = gatewayWith([passedLook("ticket-wipe")])
    for (let at = 0; at < 61; at += 1) {
      await upload(gateway, new Uint8Array([at, 1, 2, 3]), "video/mp4")
    }
    const photo = await upload(gateway, pngOf(1920, 1408))
    await started(gateway, { effect: "ticket-wipe", image: [photo] })
    await started(gateway, { effect: "ticket-wipe", image: [photo] })
    expect(await videosIn(gateway)).toBe(61)
  })
})

describe("the effects MCP lists on a server that answers only on this computer", () => {
  it("holds the drafts and no look that follows a guide before a run of it passes", async () => {
    const harness = harnessFor({
      apps: [
        offeredEffectsApp(effectRecipes, { mode: "owner", lock: "local" }),
      ],
      portsFor: localPorts,
    })
    open.push(harness)
    const listed = JSON.stringify(await mcp(harness, "tools/list", {}))
    expect(listed).toContain("many-copies")
    for (const effect of [
      "flip-into-a-new-place",
      "ticket-wipe",
      "grab-and-run",
    ]) {
      expect(listed).not.toContain(effect)
    }
  })
})

describe("the guides the engine holds", () => {
  const guided = effectRecipes.flatMap((recipe) =>
    recipe.guide === null ? [] : [recipe.guide]
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

  it("serves no file no look records", async () => {
    const files = guideEngineFiles(shippedGuides)
    expect(await files.read("another.mp4")).toBeNull()
  })
})
