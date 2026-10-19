import type { Run } from "@rosesfield/contract"
import type { StartRunHandler } from "@rosesfield/generation"
import { runIdFormat } from "@rosesfield/kernel"
import type { Proposal } from "#agent.contract"
import type { AgentHarness, ProposalRef } from "#domain/agent-harness.port"
import { conversationIdFormat } from "#domain/conversation.id"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"
import { ProposalSettledError } from "#domain/error/proposal-settled.error"
import { proposalIdFormat } from "#domain/proposal.id"

export type AcceptProposalInput = {
  conversationId: string
  proposalId: string
}

export type AcceptProposalOutput = {
  proposal: Proposal
  run: Run
}

type AcceptProposalHandlerOptions = {
  agent: AgentHarness | null
  startRun: StartRunHandler
}

export class AcceptProposalHandler {
  static readonly keyPrefix = "proposal-"

  private readonly agent: AgentHarness | null
  private readonly startRun: StartRunHandler

  constructor(options: AcceptProposalHandlerOptions) {
    this.agent = options.agent
    this.startRun = options.startRun
  }

  async execute(input: AcceptProposalInput): Promise<AcceptProposalOutput> {
    const agent = this.agent
    if (agent === null) {
      throw new AgentModelMissingError()
    }
    const ref: ProposalRef = {
      conversationId: conversationIdFormat.parse(input.conversationId),
      proposalId: proposalIdFormat.parse(input.proposalId),
    }
    const { proposal, body } = await agent.readProposal(ref)
    if (proposal.status === "skipped") {
      throw new ProposalSettledError({
        proposalId: proposal.id,
        status: proposal.status,
      })
    }
    const { run } = await this.startRun.execute({
      appId: proposal.appId,
      body,
      idempotencyKey: `${AcceptProposalHandler.keyPrefix}${proposal.id}`,
      seed: null,
    })
    if (proposal.status === "accepted") {
      return { proposal, run }
    }
    const accepted = await agent.settleProposal(ref, {
      status: "accepted",
      runId: runIdFormat.parse(run.id),
    })
    return { proposal: accepted, run }
  }
}
