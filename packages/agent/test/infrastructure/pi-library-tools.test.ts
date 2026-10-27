import {
  type FauxResponseStep,
  fauxAssistantMessage,
  fauxToolCall,
} from "@earendil-works/pi-ai"
import type { Asset } from "@rosesfield/contract"
import { Run } from "@rosesfield/generation"
import { assetIdFormat, characterIdFormat } from "@rosesfield/kernel"
import { Character } from "@rosesfield/library"
import { afterEach, describe, expect, it } from "vitest"
import { type RunWait, runWait } from "#infrastructure/pi-library-tools"
import { unseenNoteOf } from "#infrastructure/router-chat-media"
import { FakeAssetRepository } from "../fake/fake-asset-repository"
import { FakeCharacterRepository } from "../fake/fake-character-repository"
import {
  type AgentRig,
  agentFor,
  allToolsFor,
  type Generation,
  generationFor,
  type Library,
  lastMessageOf,
  lastToolResultOf,
  noWait,
  readAll,
  textOf,
} from "../harness"
import { assetUuid, characterUuid, imageApp, start } from "../sample"

const assetId = assetIdFormat.parse(assetUuid)
const characterId = characterIdFormat.parse(characterUuid)

const image: Asset = {
  id: assetId,
  kind: "image",
  mime: "image/png",
  bytes: 8,
  width: 1,
  height: 1,
  durationSeconds: null,
  sourceRunId: null,
  createdAt: start.toISOString(),
}

let rig: AgentRig | null = null

afterEach(async () => {
  await rig?.close()
  rig = null
})

async function libraryWithOneOfEach(): Promise<Library> {
  const library = {
    assets: new FakeAssetRepository(),
    characters: new FakeCharacterRepository(),
  }
  await library.assets.add(image)
  await library.characters.add(
    Character.create({
      id: characterId,
      name: "Rosa",
      references: [assetId],
      notes: "red coat",
      now: start,
    })
  )
  return library
}

type ToolArguments = Parameters<typeof fauxToolCall>[1]

function echo(
  calls: readonly { name: string; args: ToolArguments }[]
): FauxResponseStep[] {
  return [
    ...calls.map((call) =>
      fauxAssistantMessage([fauxToolCall(call.name, call.args)], {
        stopReason: "toolUse",
      })
    ),
    (context) => {
      const result = lastToolResultOf(context)
      const mark = result?.isError ? "error: " : "ok: "
      return fauxAssistantMessage(mark + textOf(result))
    },
  ]
}

async function ask(
  generation: Generation,
  library: Library,
  steps: FauxResponseStep[],
  wait: RunWait = noWait
): Promise<string> {
  await rig?.close()
  rig = agentFor(allToolsFor([imageApp()], generation, library, wait))
  rig.faux.setResponses(steps)
  const { id } = await rig.agent.startConversation({ runApproval: "auto" })
  const events = await readAll(
    await rig.agent.send({ conversationId: id, text: "Look" })
  )
  expect(events.at(-1)).toEqual({ type: "done" })
  return lastMessageOf(events)
}

describe("the library and run tools", () => {
  it("lists the assets of one kind", async () => {
    const library = await libraryWithOneOfEach()
    const generation = generationFor([imageApp()])

    const images = await ask(
      generation,
      library,
      echo([{ name: "list_assets", args: { kind: "image" } }])
    )
    const videos = await ask(
      generation,
      library,
      echo([{ name: "list_assets", args: { kind: "video" } }])
    )

    expect(images).toBe(
      `ok: ${JSON.stringify({ assets: [image], next: null })}`
    )
    expect(videos).toBe(`ok: ${JSON.stringify({ assets: [], next: null })}`)
  })

  it("reads one asset, and answers an unknown id with an error", async () => {
    const library = await libraryWithOneOfEach()
    const generation = generationFor([imageApp()])

    const found = await ask(
      generation,
      library,
      echo([{ name: "read_asset", args: { assetId } }])
    )
    const missing = await ask(
      generation,
      library,
      echo([
        {
          name: "read_asset",
          args: { assetId: "1c2d3e4f-5a6b-4c7d-9e8f-0a1b2c3d4e5f" },
        },
      ])
    )

    expect(found).toBe(
      `ok: ${JSON.stringify({ asset: image, run: null, note: unseenNoteOf("image") })}`
    )
    expect(missing.startsWith("error: ")).toBe(true)
    expect(missing).toContain("No asset has the id")
  })

  it("lists and reads the characters", async () => {
    const library = await libraryWithOneOfEach()
    const generation = generationFor([imageApp()])

    const listed = await ask(
      generation,
      library,
      echo([{ name: "list_characters", args: {} }])
    )
    const read = await ask(
      generation,
      library,
      echo([{ name: "read_character", args: { characterId } }])
    )

    const record = (await library.characters.get(characterId))?.toRecord()
    expect(record?.notes).toBe("red coat")
    expect(listed).toBe(`ok: ${JSON.stringify({ characters: [record] })}`)
    expect(read).toBe(`ok: ${JSON.stringify({ character: record })}`)
  })

  it("waits in one read_run call until the run ends, with no model call between", async () => {
    const library = await libraryWithOneOfEach()
    const generation = generationFor([imageApp()])
    let waits = 0
    const finishOnSecondWait: RunWait = async () => {
      waits += 1
      const [runId] = generation.jobs.enqueued
      const stored =
        runId === undefined ? null : await generation.runs.get(runId)
      if (waits === 2 && stored !== null) {
        const state = stored.toState()
        await generation.runs.save(
          Run.restore({
            ...state,
            record: {
              ...state.record,
              status: "done",
              outputs: [assetId],
              finishedAt: start.toISOString(),
            },
          })
        )
      }
    }

    const answer = await ask(
      generation,
      library,
      startThenReadRun(),
      finishOnSecondWait
    )

    expect(JSON.parse(answer).run).toMatchObject({
      appId: "sample-image",
      status: "done",
      outputs: [assetId],
    })
    expect(waits).toBe(2)
    expect(rig?.faux.state.callCount).toBe(3)
  })

  it("answers the run as it stands once the wait passes its time limit", async () => {
    const library = await libraryWithOneOfEach()
    const generation = generationFor([imageApp()])
    let waited = 0
    const countWait: RunWait = async (ms) => {
      waited += ms
    }

    const answer = await ask(generation, library, startThenReadRun(), countWait)

    expect(JSON.parse(answer).run).toMatchObject({
      appId: "sample-image",
      status: "queued",
    })
    expect(waited).toBe(runWait.limitMs)
    expect(rig?.faux.state.callCount).toBe(3)
  })
})

function startThenReadRun(): FauxResponseStep[] {
  return [
    fauxAssistantMessage(
      [fauxToolCall("sample-image", { inputs: { prompt: "a rose" } })],
      { stopReason: "toolUse" }
    ),
    (context) => {
      const runId = JSON.parse(textOf(lastToolResultOf(context))).run.id
      return fauxAssistantMessage([fauxToolCall("read_run", { runId })], {
        stopReason: "toolUse",
      })
    },
    (context) => fauxAssistantMessage(textOf(lastToolResultOf(context))),
  ]
}
