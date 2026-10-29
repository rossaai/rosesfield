import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai"
import { readApps } from "@rosesfield/catalog"
import { offeredPresets, vfxApp } from "@rosesfield/catalog/vfx"
import type { AppDefinition } from "@rosesfield/contract"
import {
  DemoGenerationEngine,
  type EngineFile,
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

const clip = "0d9c8b7a-6f5e-4d3c-9b2a-1f0e9d8c7b6a"

class NoFiles extends RunAssets {
  override async read(): Promise<EngineFile> {
    throw new Error("A clip preset reads no photo to check")
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

function vfx(): AppDefinition {
  const [one] = readApps([{ folder: "vfx", app: vfxApp(offeredPresets) }])
  if (one === undefined) {
    throw new Error("The vfx app did not parse")
  }
  return one
}

async function callPreset(resolution: string) {
  const made = generationFor([vfx()])
  const generation = {
    ...made,
    startRun: new StartRunHandler({
      apps: new FakeAppCatalog([vfx()]),
      runs: made.runs,
      engines: [new DemoGenerationEngine({ clock: made.clock })],
      jobs: made.jobs,
      clock: made.clock,
      assets: new NoFiles(),
    }),
  }
  rig = agentFor(appToolsFor([vfx()], generation))
  const results: string[] = []
  rig.faux.setResponses([
    fauxAssistantMessage(
      [
        fauxToolCall("vfx", {
          inputs: { preset: "day-to-night", clip: [clip], resolution },
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

describe("the agent's VFX preset call", () => {
  it("starts the 480p draft in one call", async () => {
    const { generation, proposals } = await callPreset("480p")
    expect(generation.runs.count).toBe(1)
    expect(proposals).toBe(0)
  })

  it("holds the 720p final for the person's yes, even when runs start on their own", async () => {
    const { generation, proposals } = await callPreset("720p")
    expect(generation.runs.count).toBe(0)
    expect(proposals).toBe(1)
  })

  it("tells the model to check the input against each preset's need, draft first and leave the guide to Rosesfield", () => {
    const description = appToolDescription(vfx())
    for (const preset of offeredPresets) {
      expect(description).toContain(`${preset.id}: `)
    }
    expect(description).toMatch(/Leave guide out/)
    expect(description).toMatch(/only after the person says yes/)
  })
})
