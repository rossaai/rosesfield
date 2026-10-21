import type {
  ToolExecutionApi,
  ToolExecutionResult,
  ToolRegistration,
} from "@earendil-works/pi-durable"
import type { ModelForm } from "@rosesfield/catalog/comfy"
import type { AppDefinition, RunRequest } from "@rosesfield/contract"
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
import {
  type KeyframeHandlers,
  keyframeRunsOf,
} from "#infrastructure/pi-keyframe-chain"
import { type RunWait, timerWait } from "#infrastructure/pi-library-tools"
import {
  appInputOf,
  isKeyframeChain,
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

export function appTool(options: AppToolOptions): ToolRegistration {
  const { app, handlers } = options
  const schema = appInputOf(app, options.forms ?? [])
  const wait = options.wait ?? timerWait
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
      if (isKeyframeChain(app)) {
        const runs = await keyframeRunsOf({
          appId: app.id,
          request: parseRequest(app, schema, args),
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

export function proposalOf(record: ProposalRecord): Proposal {
  return {
    id: proposalIdFormat.parse(record.id),
    appId: appIdFormat.parse(record.appId),
    request: record.request,
    status: record.status,
    runId: record.runId === null ? null : runIdFormat.parse(record.runId),
  }
}
