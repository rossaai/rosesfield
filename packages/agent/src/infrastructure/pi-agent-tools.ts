import {
  defineExtension,
  type Extension,
  section,
  type ToolRegistration,
} from "@earendil-works/pi-durable"
import { type ModelForm, publishedModelOf } from "@rosesfield/catalog/comfy"
import type { AppDefinition } from "@rosesfield/contract"
import type {
  ReadModelFormsHandler,
  StartRunHandler,
} from "@rosesfield/generation"
import { agentCopy } from "#copy.en"
import { appTool } from "#infrastructure/pi-app-tool"
import {
  type LibraryToolHandlers,
  libraryTools,
  type RunWait,
} from "#infrastructure/pi-library-tools"

export type AgentToolHandlers = LibraryToolHandlers & {
  startRun: StartRunHandler
  readModelForms: ReadModelFormsHandler
}

export type AgentToolSet = {
  tools: ToolRegistration[]
  complete: boolean
}

export type AgentToolSource =
  | readonly ToolRegistration[]
  | (() => Promise<AgentToolSet>)

type AgentToolsOptions = {
  apps: readonly AppDefinition[]
  handlers: () => AgentToolHandlers
  forms?: readonly ModelForm[]
  wait?: RunWait
}

function openApps(apps: readonly AppDefinition[]): AppDefinition[] {
  return apps.filter((app) => app.closedKey === null)
}

export function agentTools(options: AgentToolsOptions): ToolRegistration[] {
  const { handlers } = options
  const forms = options.forms ?? []
  return [
    ...openApps(options.apps).map((app) =>
      appTool({
        app,
        handlers,
        forms,
        ...(options.wait === undefined ? {} : { wait: options.wait }),
      })
    ),
    ...libraryTools(handlers, options.wait),
  ]
}

export function publishedAgentTools(
  options: AgentToolsOptions
): () => Promise<AgentToolSet> {
  return async () => {
    const models = openApps(options.apps).flatMap((app) => {
      const model = publishedModelOf(app)
      return model === null ? [] : [model]
    })
    const read =
      models.length === 0
        ? { forms: [], refusal: null }
        : await options.handlers().readModelForms.execute({ models })
    return {
      tools: agentTools({ ...options, forms: read.forms }),
      complete: read.forms.length === new Set(models).size,
    }
  }
}

export function toolSourceOf(
  source: AgentToolSource
): () => Promise<AgentToolSet> {
  if (typeof source === "function") {
    return source
  }
  const tools = [...source]
  return async () => ({ tools, complete: true })
}

export function extensionOf(tools: readonly ToolRegistration[]): Extension {
  return defineExtension({
    name: "rosesfield",
    tools,
    sections: [section("rosesfield", () => agentCopy.instructions)],
  })
}
