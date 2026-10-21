import type { ToolRegistration } from "@earendil-works/pi-durable"
import { type ModelForm, publishedModelOf } from "@rosesfield/catalog/comfy"
import type { AppDefinition } from "@rosesfield/contract"
import type {
  ReadModelFormsHandler,
  StartRunHandler,
} from "@rosesfield/generation"
import { appTool } from "#infrastructure/pi-app-tool"
import {
  type LibraryToolHandlers,
  libraryTools,
} from "#infrastructure/pi-library-tools"

export type AgentToolHandlers = LibraryToolHandlers & {
  startRun: StartRunHandler
  readModelForms: ReadModelFormsHandler
}

export type AgentToolSet = {
  tools: ToolRegistration[]
  complete: boolean
}

type AgentToolsOptions = {
  apps: readonly AppDefinition[]
  handlers: () => AgentToolHandlers
  forms?: readonly ModelForm[]
}

function openApps(apps: readonly AppDefinition[]): AppDefinition[] {
  return apps.filter((app) => app.closedKey === null)
}

export function agentTools(options: AgentToolsOptions): ToolRegistration[] {
  const { handlers } = options
  const forms = options.forms ?? []
  return [
    ...openApps(options.apps).map((app) =>
      appTool(app, () => handlers().startRun, forms)
    ),
    ...libraryTools(handlers),
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
