import type {
  ToolExecutionApi,
  ToolExecutionResult,
  ToolRegistration,
} from "@earendil-works/pi-durable"
import {
  type AppDefinition,
  type RunRequest,
  startRunBodyFor,
} from "@rosesfield/contract"
import {
  RunInputInvalidError,
  type StartRunHandler,
} from "@rosesfield/generation"
import { appIdFormat, runIdFormat } from "@rosesfield/kernel"
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
import { jsonOutput, toolParameters } from "#infrastructure/pi-tool-io"

const idempotencyMemo = "idempotencyKey"
const proposalMemo = "proposalId"
const jsonBody = z.record(z.string(), z.json())

export function appTool(
  app: AppDefinition,
  startRun: () => StartRunHandler
): ToolRegistration {
  const schema = startRunBodyFor(app)
  return {
    name: app.id,
    description: agentCopy.tools.app(app),
    parameters: toolParameters(schema),
    replay: "unsafe",
    execute: async (args: unknown, api, context) => {
      const settings = await api.snapshot(
        conversationSettings,
        api.conversationId,
        context
      )
      if ((settings?.runApproval ?? "ask") === "ask") {
        const request = parseRequest(app, schema, args)
        return propose(
          { app, request, body: jsonBody.parse(args) },
          api,
          context
        )
      }
      const idempotencyKey = await api.memo(
        idempotencyMemo,
        `agent-${crypto.randomUUID()}`,
        context
      )
      const started = await startRun().execute({
        appId: app.id,
        body: args,
        idempotencyKey,
        seed: null,
      })
      return {
        output: jsonOutput(started),
        details: { runId: started.run.id },
      }
    },
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

function parseRequest(
  app: AppDefinition,
  schema: z.ZodType<RunRequest>,
  args: unknown
): RunRequest {
  const result = schema.safeParse(args)
  if (result.success) {
    return result.data
  }
  const issues = result.error.issues.map(
    (issue) => `${issue.path.join(".") || "body"}: ${issue.message}`
  )
  throw new RunInputInvalidError({ appId: app.id, issues })
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
