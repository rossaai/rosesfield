import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai"
import { findApp, readApps } from "@rosesfield/catalog"
import { approvedExamples, motionApp } from "@rosesfield/catalog/motion"
import { type AppDefinition, type Run, run } from "@rosesfield/contract"
import {
  DemoGenerationEngine,
  type EngineFile,
  GetRunHandler,
  type GetRunOutput,
  RunAssets,
  StartRunHandler,
} from "@rosesfield/generation"
import { type AssetId, assetIdFormat } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { appToolDescription } from "#infrastructure/pi-app-tool"
import { FakeAppCatalog } from "../fake/fake-app-catalog"
import {
  type AgentRig,
  agentFor,
  appToolsFor,
  generationFor,
  lastToolResultOf,
  readAll,
  textOf,
} from "../harness"

const photo = "0d9c8b7a-6f5e-4d3c-9b2a-1f0e9d8c7b6a"

function pngOf(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(8, 13)
  view.setUint32(16, width)
  view.setUint32(20, height)
  bytes.set([8, 6], 24)
  return bytes
}

class OnePhoto extends RunAssets {
  override async read(): Promise<EngineFile> {
    return {
      assetId: assetIdFormat.parse(photo),
      kind: "image",
      mime: "image/png",
      bytes: pngOf(1080, 1920),
    }
  }

  override async referencesOf(): Promise<readonly AssetId[]> {
    return []
  }

  override async keep(): Promise<AssetId> {
    return assetIdFormat.parse(crypto.randomUUID())
  }
}

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

function effects(): AppDefinition {
  const [one] = readApps([
    { folder: "motion", app: motionApp(approvedExamples) },
  ])
  if (one === undefined) {
    throw new Error("The Motion app did not parse")
  }
  return one
}

/** Motion and the Image app its edit and restore run on, every step priced at 10 credits, under the limit a run may cost without asking. */
const draftId = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f"

/** Your own video's 480p draft, done, holding its last frame. */
const doneDraft: Run = run.parse({
  id: draftId,
  appId: "motion",
  status: "done",
  inputs: {
    example: "own",
    model: "ltx-2-5-guide",
    firstFrame: [photo],
    guide: [photo],
    mask: [photo],
    plannedScene: "A man walks down a street.",
    resolution: "480p",
    seed: 9,
  },
  count: 1,
  aspectRatio: "9:16",
  seed: 9,
  outputs: [photo],
  held: [{ nodeId: "1011", assetId: photo, kind: "image" }],
  progress: 1,
  engine: { adapter: "demo", models: [], workflowHash: null },
  cost: null,
  origin: "demo",
  failure: null,
  createdAt: "2026-10-29T10:00:00.000Z",
  finishedAt: "2026-10-29T10:01:00.000Z",
})

class OneDraft extends GetRunHandler {
  override async execute(): Promise<GetRunOutput> {
    return { run: doneDraft }
  }
}

async function callMotion(inputs: Record<string, string | string[]>) {
  const image = findApp("image")
  if (image === null) {
    throw new Error("The catalog lacks Image")
  }
  const made = generationFor([effects(), image])
  rig = agentFor(
    appToolsFor([effects()], made, [], undefined, {
      getRun: new OneDraft({ runs: made.runs }),
    })
  )
  const results: string[] = []
  rig.faux.setResponses([
    fauxAssistantMessage([fauxToolCall("motion", { inputs })], {
      stopReason: "toolUse",
    }),
    (context) => {
      results.push(textOf(lastToolResultOf(context)))
      return fauxAssistantMessage("ok")
    },
  ])
  const { id } = await rig.agent.startConversation({ runApproval: "auto" })
  const events = await readAll(
    await rig.agent.send({ conversationId: id, text: "Make the final" })
  )
  return {
    generation: made,
    result: results[0] ?? "",
    proposals: events.filter((event) => event.type === "proposal").length,
    credits: events.flatMap((event) =>
      event.type === "proposal" ? [event.proposal.credits] : []
    ),
  }
}

async function callPreset(resolution: string | null) {
  const made = generationFor([effects()])
  const generation = {
    ...made,
    startRun: new StartRunHandler({
      apps: new FakeAppCatalog([effects()]),
      runs: made.runs,
      engines: [new DemoGenerationEngine({ clock: made.clock })],
      jobs: made.jobs,
      clock: made.clock,
      assets: new OnePhoto(),
    }),
  }
  rig = agentFor(appToolsFor([effects()], generation))
  const results: string[] = []
  rig.faux.setResponses([
    fauxAssistantMessage(
      [
        fauxToolCall("motion", {
          inputs: {
            example: "grab-and-run",
            photo: [photo],
            ...(resolution === null ? {} : { resolution }),
          },
        }),
      ],
      { stopReason: "toolUse" }
    ),
    (context) => {
      results.push(textOf(lastToolResultOf(context)))
      return fauxAssistantMessage("ok")
    },
  ])
  const { id } = await rig.agent.startConversation({ runApproval: "auto" })
  const events = await readAll(
    await rig.agent.send({ conversationId: id, text: "Night" })
  )
  return {
    generation,
    result: results[0] ?? "",
    proposals: events.filter((event) => event.type === "proposal").length,
  }
}

describe("the agent's call of a Library example", () => {
  it("starts the 480p draft of an example in one call", async () => {
    const { generation, proposals } = await callPreset("480p")
    expect(generation.runs.count).toBe(1)
    expect(proposals).toBe(0)
  })

  it("holds a call with no resolution for the person's yes, since Motion's default is 720p", async () => {
    const { generation, proposals } = await callPreset(null)
    expect(generation.runs.count).toBe(0)
    expect(proposals).toBe(1)
  })

  it("holds the 720p final for the person's yes, even when runs start on their own", async () => {
    const { generation, proposals } = await callPreset("720p")
    expect(generation.runs.count).toBe(0)
    expect(proposals).toBe(1)
  })

  it("tells the model to check the photo against each example's need and draft first, in words with no engine term", () => {
    const description = appToolDescription(effects())
    for (const example of approvedExamples) {
      expect(description).toContain(`${example.id}: `)
    }
    expect(description).not.toMatch(/guide|depth|adapter|preset|sha256/i)
    expect(description).toMatch(/only after the person says yes/)
  })

  it("holds the final of your own video, which names its draft, for the person's yes, even when runs start on their own", async () => {
    const { generation, proposals, result, credits } = await callMotion({
      clip: [photo],
      photo: [photo],
      draft: draftId,
      resolution: "720p",
    })
    expect(generation.runs.count).toBe(0)
    expect(proposals).toBe(1)
    expect(result).toBe("")
    expect(credits).toHaveLength(1)
    expect(credits[0]).toBeCloseTo(10.86 + 6.76, 6)
  })

  it("tells the model how to change your own video in one call and make its final in a second that names the draft, only after a yes", () => {
    const description = appToolDescription(effects())
    expect(description).toContain("inputs.draft")
    expect(description).toMatch(/Only after they say yes/)
    expect(description).not.toMatch(/guide|depth|mask|matte|plan\b|ffmpeg/i)
  })
})
