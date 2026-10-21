import type { Tool, ToolCall } from "@earendil-works/pi-ai"
import { validateToolArguments } from "@earendil-works/pi-ai/utils/validation"
import type {
  ToolExecutionApi,
  ToolExecutionResult,
  ToolRegistration,
} from "@earendil-works/pi-durable"
import type { ModelForm } from "@rosesfield/catalog/comfy"
import {
  type AppDefinition,
  errorEnvelopeOf,
  type RunRequest,
} from "@rosesfield/contract"
import { RunInputInvalidError } from "@rosesfield/generation"
import { appIdFormat, ProjectError, runIdFormat } from "@rosesfield/kernel"
import { z } from "zod"
import type { Proposal } from "#agent.contract"
import { agentCopy } from "#copy.en"
import { proposalIdFormat } from "#domain/proposal.id"
import type { PiContext } from "#infrastructure/pi-context"
import {
  conversationSettings,
  type ProposalRecord,
  proposalRecords,
} from "#infrastructure/pi-conversation-docs"
import {
  type KeyframeHandlers,
  keyframeRunsOf,
} from "#infrastructure/pi-keyframe-chain"
import { type RunWait, timerWait } from "#infrastructure/pi-library-tools"
import {
  appInputOf,
  isKeyframeChain,
  isRecord,
  issuesOf,
  parseRequest,
} from "#infrastructure/pi-run-request"
import { jsonOutput, toolParameters } from "#infrastructure/pi-tool-io"

const idempotencyMemo = "idempotencyKey"
const proposalMemo = "proposalId"
const jsonBody = z.record(z.string(), z.json())

type AppToolOptions = {
  app: AppDefinition
  handlers: () => KeyframeHandlers
  forms?: readonly ModelForm[]
  wait?: RunWait
}

function refusalTextOf(error: ProjectError): string {
  return JSON.stringify({ ...errorEnvelopeOf(error), message: error.message })
}

function checkedArguments(
  app: AppDefinition,
  tool: Tool,
  schema: z.ZodType<unknown>,
  args: unknown
): unknown {
  try {
    if (!isRecord(args)) {
      throw new Error("The arguments are not an object")
    }
    const call: ToolCall = {
      type: "toolCall",
      id: tool.name,
      name: tool.name,
      arguments: jsonBody.parse(args),
    }
    return validateToolArguments(tool, call)
  } catch (error) {
    const found = issuesOf(schema, args)
    const issues =
      found.length > 0
        ? found
        : [error instanceof Error ? error.message : String(error)]
    throw new Error(
      refusalTextOf(new RunInputInvalidError({ appId: app.id, issues }))
    )
  }
}

function refusalOf(error: ProjectError): ToolExecutionResult {
  return {
    output: [{ type: "text", text: refusalTextOf(error) }],
    isError: true,
  }
}

export function appTool(options: AppToolOptions): ToolRegistration {
  const { app, handlers } = options
  const schema = appInputOf(app, options.forms ?? [])
  const wait = options.wait ?? timerWait
  const tool: Tool = {
    name: app.id,
    description: agentCopy.tools.app(app),
    parameters: toolParameters(schema),
  }
  return {
    ...tool,
    replay: "unsafe",
    prepareArguments: (args: unknown) =>
      checkedArguments(app, tool, schema, args),
    execute: async (args: unknown, api, context) => {
      try {
        return await runApp({ app, schema, handlers, wait }, args, api, context)
      } catch (error) {
        if (error instanceof ProjectError) {
          return refusalOf(error)
        }
        throw error
      }
    },
  }
}

type AppRun = {
  app: AppDefinition
  schema: z.ZodType<unknown>
  handlers: () => KeyframeHandlers
  wait: RunWait
}

async function runApp(
  { app, schema, handlers, wait }: AppRun,
  args: unknown,
  api: ToolExecutionApi,
  context: PiContext
): Promise<ToolExecutionResult> {
  const request = parseRequest(app, schema, args)
  const settings = await api.snapshot(
    conversationSettings,
    api.conversationId,
    context
  )
  if ((settings?.runApproval ?? "ask") === "ask") {
    return propose({ app, request, body: jsonBody.parse(args) }, api, context)
  }
  const idempotencyKey = await api.memo(
    idempotencyMemo,
    `agent-${crypto.randomUUID()}`,
    context
  )
  if (isKeyframeChain(app)) {
    const runs = await keyframeRunsOf({
      appId: app.id,
      request,
      key: idempotencyKey,
      handlers: handlers(),
      wait,
      signal: context.abortSignal,
    })
    return {
      output: jsonOutput({ runs }),
      details: { runIds: runs.flatMap((run) => run?.id ?? []) },
    }
  }
  const started = await handlers().startRun.execute({
    appId: app.id,
    body: args,
    idempotencyKey,
    seed: null,
  })
  return {
    output: jsonOutput(started),
    details: { runId: started.run.id },
  }
}

type Proposed = {
  app: AppDefinition
  request: RunRequest
  body: ProposalRecord["body"]
}

async function propose(
  proposed: Proposed,
  api: ToolExecutionApi,
  context: PiContext
): Promise<ToolExecutionResult> {
  const id = await api.memo(proposalMemo, crypto.randomUUID(), context)
  const record: ProposalRecord = {
    id,
    appId: proposed.app.id,
    request: proposed.request,
    body: proposed.body,
    status: "proposed",
    runId: null,
  }
  await api.commit(async (tx) => {
    await tx.doc(proposalRecords, api.conversationId, id, record)
  }, context)
  const proposal = proposalOf(record)
  return {
    output: jsonOutput({
      proposal,
      note: agentCopy.tools.proposed(id, proposed.app.id),
    }),
    details: { proposal },
    control: { terminate: true },
  }
}

export function proposalOf(record: ProposalRecord): Proposal {
  return {
    id: proposalIdFormat.parse(record.id),
    appId: appIdFormat.parse(record.appId),
    request: record.request,
    status: record.status,
    runId: record.runId === null ? null : runIdFormat.parse(record.runId),
  }
}
