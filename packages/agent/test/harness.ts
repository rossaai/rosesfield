import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  createModels,
  type FauxProviderHandle,
  fauxProvider,
  type ToolResultMessage,
  type TranscriptContext,
} from "@earendil-works/pi-ai"
import type { ToolRegistration } from "@earendil-works/pi-durable"
import type { AppDefinition } from "@rosesfield/contract"
import {
  DemoGenerationEngine,
  GetRunHandler,
  ReadModelFormsHandler,
  StartRunHandler,
} from "@rosesfield/generation"
import { FixedClock } from "@rosesfield/kernel"
import {
  GetAssetHandler,
  GetCharacterHandler,
  ListAssetsHandler,
  ListCharactersHandler,
} from "@rosesfield/library"
import type { AnswerEvent } from "#agent.contract"
import type { AnswerStream } from "#domain/agent-harness.port"
import { PiAgentHarness } from "#infrastructure/pi-agent-harness"
import {
  type AgentToolHandlers,
  agentTools,
} from "#infrastructure/pi-agent-tools"
import { appTool } from "#infrastructure/pi-app-tool"
import type { RunWait } from "#infrastructure/pi-library-tools"
import type { PiModels } from "#infrastructure/pi-models"
import { openSqliteFileStorage } from "#infrastructure/sqlite-file-storage"
import { FakeAppCatalog } from "./fake/fake-app-catalog"
import type { FakeAssetRepository } from "./fake/fake-asset-repository"
import type { FakeCharacterRepository } from "./fake/fake-character-repository"
import { FakeJobRunner } from "./fake/fake-job-runner"
import { FakeRunRepository } from "./fake/fake-run-repository"
import { start } from "./sample"

export type Generation = {
  clock: FixedClock
  runs: FakeRunRepository
  jobs: FakeJobRunner
  startRun: StartRunHandler
  readModelForms: ReadModelFormsHandler
}

export type AgentRig = {
  agent: PiAgentHarness
  faux: FauxProviderHandle
  file: string
  reopen: () => PiAgentHarness
  close: () => Promise<void>
}

export function generationFor(apps: readonly AppDefinition[]): Generation {
  const clock = new FixedClock({ now: start })
  const runs = new FakeRunRepository()
  const jobs = new FakeJobRunner()
  const engines = [new DemoGenerationEngine({ clock })]
  const startRun = new StartRunHandler({
    apps: new FakeAppCatalog(apps),
    runs,
    engines,
    jobs,
    clock,
  })
  const readModelForms = new ReadModelFormsHandler({ engines })
  return { clock, runs, jobs, startRun, readModelForms }
}

export function appToolsFor(
  apps: readonly AppDefinition[],
  generation: Generation
): ToolRegistration[] {
  return apps.map((app) => appTool(app, () => generation.startRun))
}

export type Library = {
  assets: FakeAssetRepository
  characters: FakeCharacterRepository
}

export function toolHandlersFor(
  generation: Generation,
  library: Library
): AgentToolHandlers {
  const { assets, characters } = library
  return {
    startRun: generation.startRun,
    readModelForms: generation.readModelForms,
    getRun: new GetRunHandler({ runs: generation.runs }),
    listAssets: new ListAssetsHandler({ assets }),
    getAsset: new GetAssetHandler({ assets }),
    listCharacters: new ListCharactersHandler({ characters }),
    getCharacter: new GetCharacterHandler({ characters }),
  }
}

export const noWait: RunWait = async () => undefined

export function allToolsFor(
  apps: readonly AppDefinition[],
  generation: Generation,
  library: Library,
  wait: RunWait = noWait
): ToolRegistration[] {
  const handlers = toolHandlersFor(generation, library)
  return agentTools({ apps, handlers: () => handlers, wait })
}

export function agentFor(
  tools: readonly ToolRegistration[],
  modelsOf?: () => Promise<PiModels>
): AgentRig {
  const folder = mkdtempSync(join(tmpdir(), "rosesfield-agent-"))
  const file = join(folder, "agent.db")
  const faux = fauxProvider()
  const models = createModels()
  models.setProvider(faux.provider)
  const model = faux.getModel()
  const fauxModels = async (): Promise<PiModels> => ({
    models,
    ref: { provider: model.provider, modelId: model.id },
  })
  const open = (): PiAgentHarness =>
    new PiAgentHarness({
      models: modelsOf ?? fauxModels,
      storage: () => openSqliteFileStorage(file),
      tools,
      clock: new FixedClock({ now: start }),
      settings: { ...PiAgentHarness.settings, retry: { enabled: false } },
    })
  const rig: AgentRig = {
    agent: open(),
    faux,
    file,
    reopen: () => {
      rig.agent = open()
      return rig.agent
    },
    close: async () => {
      await rig.agent.close()
      rmSync(folder, { recursive: true, force: true })
    },
  }
  return rig
}

export async function readAll(answer: AnswerStream): Promise<AnswerEvent[]> {
  const events: AnswerEvent[] = []
  for await (const event of answer) {
    events.push(event)
  }
  return events
}

export function lastMessageOf(events: readonly AnswerEvent[]): string {
  const texts = events.flatMap((event) =>
    event.type === "message" ? [event.text] : []
  )
  return texts.at(-1) ?? ""
}

export function lastToolResultOf(
  context: TranscriptContext
): ToolResultMessage | undefined {
  return context.messages.findLast(
    (message): message is ToolResultMessage => message.role === "toolResult"
  )
}

export function textOf(message: ToolResultMessage | undefined): string {
  return (message?.content ?? [])
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
}
