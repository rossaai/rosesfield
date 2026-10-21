import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { EngineBinding } from "@rosesfield/contract"
import {
  DemoGenerationEngine,
  EngineUnavailableError,
  ReadModelFormsHandler,
} from "@rosesfield/generation"
import type { ModelForm } from "@rosesfield/generation/bindings"
import { FixedClock } from "@rosesfield/kernel"
import { afterEach, describe, expect, it } from "vitest"
import { z } from "zod"
import type { PiAgentHarness } from "#infrastructure/pi-agent-harness"
import { routerAgentModel } from "#infrastructure/pi-models"
import { routerAgentHarness } from "#infrastructure/router-agent-harness"
import { defaultChatModel } from "#infrastructure/router-chat-models"
import { openSqliteFileStorage } from "#infrastructure/sqlite-file-storage"
import { FakeAssetRepository } from "../fake/fake-asset-repository"
import { FakeCharacterRepository } from "../fake/fake-character-repository"
import { clipApp, clipForm } from "../fixtures/clip-app"
import {
  type RouterReplay,
  type RouterRequest,
  replayRouter,
  textAnswer,
} from "../fixtures/router-chat-answers"
import { generationFor, readAll, toolHandlersFor } from "../harness"
import { start } from "../sample"

type FormAnswer = "form" | "none" | "refused"

class FormEngine extends DemoGenerationEngine {
  answer: FormAnswer = "form"
  reads = 0

  override async formOf(_binding: EngineBinding): Promise<ModelForm | null> {
    this.reads += 1
    if (this.answer === "refused") {
      throw new EngineUnavailableError({ cause: "the Router answered 503" })
    }
    return this.answer === "form" ? clipForm : null
  }
}

const routerTools = z.array(
  z.object({
    function: z.object({ name: z.string(), parameters: z.unknown() }),
  })
)

type Opened = {
  agent: PiAgentHarness
  engine: FormEngine
  replay: RouterReplay
}

const folders: string[] = []
const agents: PiAgentHarness[] = []

afterEach(async () => {
  await Promise.all(agents.splice(0).map((agent) => agent.close()))
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true })
  }
})

function openAgent(turns: number): Opened {
  const clock = new FixedClock({ now: start })
  const engine = new FormEngine({ clock })
  const generation = generationFor([clipApp()])
  const handlers = {
    ...toolHandlersFor(generation, {
      assets: new FakeAssetRepository(),
      characters: new FakeCharacterRepository(),
    }),
    readModelForms: new ReadModelFormsHandler({ engines: [engine] }),
  }
  const replay = replayRouter(
    Array.from({ length: turns }, (_, turn) =>
      textAnswer(defaultChatModel, `Answer ${turn + 1}.`, 0.0001)
    )
  )
  const folder = mkdtempSync(join(tmpdir(), "rosesfield-router-agent-"))
  folders.push(folder)
  const agent = routerAgentHarness({
    model: routerAgentModel("comfyui-rosesfield-test"),
    modelOptions: { fetch: replay.fetch },
    storage: () => openSqliteFileStorage(join(folder, "agent.db")),
    apps: [clipApp()],
    handlers: () => handlers,
    clock,
  })
  agents.push(agent)
  return { agent, engine, replay }
}

function offeredTo(request: RouterRequest | undefined, name: string): string {
  const tools = routerTools.parse(request?.body.tools)
  const tool = tools.find((one) => one.function.name === name)
  return JSON.stringify(tool?.function.parameters ?? null)
}

async function turn(agent: PiAgentHarness, text: string): Promise<void> {
  const { id } = await agent.startConversation({ runApproval: "ask" })
  await readAll(await agent.send({ conversationId: id, text }))
}

describe("the agent the server opens on the Router", () => {
  it("offers the Router each app's published form, not the app's own inputs", async () => {
    const { agent, replay } = openAgent(1)

    await turn(agent, "A clip of orbit")

    const offered = offeredTo(replay.requests[0], "clips")
    expect(offered).toContain('"resolution"')
    expect(offered).toContain('"768P"')
    expect(offered).not.toContain('"length"')
  })

  it.each<FormAnswer>(["refused", "none"])(
    "reads the forms again on the next turn when the read at opening was %s",
    async (first) => {
      const { agent, engine, replay } = openAgent(2)
      engine.answer = first
      await agent.listModels()
      engine.answer = "form"

      await turn(agent, "A clip of orbit")
      await turn(agent, "Another clip")

      expect(offeredTo(replay.requests[0], "clips")).toContain('"resolution"')
      expect(offeredTo(replay.requests[1], "clips")).toContain('"resolution"')
      expect(engine.reads).toBe(2)
    }
  )
})
