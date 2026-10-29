import type { Tool, ToolCall } from "@earendil-works/pi-ai"
import { validateToolArguments } from "@earendil-works/pi-ai/utils/validation"
import type {
  ToolExecutionApi,
  ToolExecutionResult,
  ToolRegistration,
} from "@earendil-works/pi-durable"
import { autoRunLimitCredits, type ModelForm } from "@rosesfield/catalog/comfy"
import {
  exampleAgentNotes,
  isFinalRun,
  motionAppId,
} from "@rosesfield/catalog/motion"
import {
  type AppDefinition,
  errorEnvelopeOf,
  type RunRequest,
} from "@rosesfield/contract"
import {
  type PriceRunHandler,
  RunInputInvalidError,
} from "@rosesfield/generation"
import { appIdFormat, ProjectError, runIdFormat } from "@rosesfield/kernel"
import { z } from "zod"
import type { Proposal } from "#agent.contract"
import { StartConversationHandler } from "#application/start-conversation/start-conversation.handler"
import { agentCopy } from "#copy.en"
import { proposalIdFormat } from "#domain/proposal.id"
import { autoCreditsOf } from "#infrastructure/pi-auto-price"
import type { PiContext } from "#infrastructure/pi-context"
import {
  conversationSettings,
  type ProposalRecord,
  proposalRecords,
} from "#infrastructure/pi-conversation-docs"
import {
  chainAskOf,
  type KeyframeHandlers,
  keyframeCreditsOf,
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
const priceMemo = "priceCredits"
const jsonBody = z.record(z.string(), z.json())

export type AppToolHandlers = KeyframeHandlers & {
  priceRun: PriceRunHandler
}

type AppToolOptions = {
  app: AppDefinition
  handlers: () => AppToolHandlers
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

export function appToolDescription(app: AppDefinition): string {
  const general = agentCopy.tools.app(app)
  const notes = app.id === motionAppId ? exampleAgentNotes(app) : ""
  return notes === "" ? general : `${general}\n${notes}`
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
    description: appToolDescription(app),
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
  handlers: () => AppToolHandlers
  wait: RunWait
}

async function creditsOf(
  app: AppDefinition,
  request: RunRequest,
  priceRun: PriceRunHandler
): Promise<number | null> {
  try {
    if (isKeyframeChain(app)) {
      return await keyframeCreditsOf(
        app.id,
        chainAskOf(app.id, request),
        priceRun
      )
    }
    const { price } = await priceRun.execute({
      appId: app.id,
      inputs: request.inputs,
      count: request.count,
      aspectRatio: request.aspectRatio,
    })
    return autoCreditsOf(price)
  } catch {
    return null
  }
}

async function heldCreditsOf(
  run: AppRun,
  request: RunRequest,
  api: ToolExecutionApi,
  context: PiContext
): Promise<number | null> {
  const held = await api.memo<number | null>(priceMemo, context)
  if (held !== undefined) {
    return held
  }
  const credits = await creditsOf(run.app, request, run.handlers().priceRun)
  return api.memo(priceMemo, credits, context)
}

async function runApp(
  run: AppRun,
  args: unknown,
  api: ToolExecutionApi,
  context: PiContext
): Promise<ToolExecutionResult> {
  const { app } = run
  const request = parseRequest(app, run.schema, args)
  const settings = await api.snapshot(
    conversationSettings,
    api.conversationId,
    context
  )
  const approval = settings?.runApproval ?? StartConversationHandler.runApproval
  const proposed = { app, request, body: jsonBody.parse(args) }
  if (approval === "ask" || isFinalRun(app.id, request.inputs)) {
    return propose(proposed, api, context)
  }
  if (isKeyframeChain(app)) {
    chainAskOf(app.id, request)
  }
  const credits = await heldCreditsOf(run, request, api, context)
  if (credits === null || credits > autoRunLimitCredits) {
    return propose({ ...proposed, price: { credits } }, api, context)
  }
  return startApp(run, { request, args }, api, context)
}

async function startApp(
  { app, handlers, wait }: AppRun,
  { request, args }: { request: RunRequest; args: unknown },
  api: ToolExecutionApi,
  context: PiContext
): Promise<ToolExecutionResult> {
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
      details: { runIds: runs.flatMap((one) => one?.id ?? []) },
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
  price?: { credits: number | null }
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
    runIds: [],
  }
  await api.commit(async (tx) => {
    await tx.doc(proposalRecords, api.conversationId, id, record)
  }, context)
  const proposal = proposalOf(record)
  return {
    output: jsonOutput({
      proposal,
      note: noteOf(id, proposed),
      ...(proposed.price === undefined
        ? {}
        : {
            credits: proposed.price.credits,
            askAboveCredits: autoRunLimitCredits,
          }),
    }),
    details: { proposal },
    control: { terminate: true },
  }
}

function noteOf(id: string, proposed: Proposed): string {
  const settled = { proposalId: id, appId: proposed.app.id }
  const credits = proposed.price?.credits
  if (credits === undefined) {
    return agentCopy.tools.proposed(id, proposed.app.id)
  }
  return credits === null
    ? agentCopy.tools.proposedUnpriced(settled)
    : agentCopy.tools.proposedOverLimit(settled, {
        credits,
        limit: autoRunLimitCredits,
      })
}

export function proposalOf(record: ProposalRecord): Proposal {
  return {
    id: proposalIdFormat.parse(record.id),
    appId: appIdFormat.parse(record.appId),
    request: record.request,
    status: record.status,
    runIds: record.runIds.map((runId) => runIdFormat.parse(runId)),
  }
}
