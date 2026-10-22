import type { Run } from "@rosesfield/contract"
import { runIdFormat } from "@rosesfield/kernel"
import type { Proposal } from "#agent.contract"
import type { AgentHarness, ProposalRef } from "#domain/agent-harness.port"
import { conversationIdFormat } from "#domain/conversation.id"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"
import { ProposalSettledError } from "#domain/error/proposal-settled.error"
import { proposalIdFormat } from "#domain/proposal.id"
import type { ProposalRunner } from "#domain/proposal-runner.port"

export type AcceptProposalInput = {
  conversationId: string
  proposalId: string
}

export type AcceptProposalOutput = {
  proposal: Proposal
  runs: Run[]
}

type AcceptProposalHandlerOptions = {
  agent: AgentHarness | null
  runner: ProposalRunner
}

export class AcceptProposalHandler {
  static readonly keyPrefix = "proposal-"

  private readonly agent: AgentHarness | null
  private readonly runner: ProposalRunner

  constructor(options: AcceptProposalHandlerOptions) {
    this.agent = options.agent
    this.runner = options.runner
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
    const runs = await this.runner.start({
      appId: proposal.appId,
      request: proposal.request,
      body,
      key: `${AcceptProposalHandler.keyPrefix}${proposal.id}`,
    })
    if (proposal.status === "accepted") {
      return { proposal, runs }
    }
    const accepted = await agent.settleProposal(ref, {
      status: "accepted",
      runIds: runs.map((run) => runIdFormat.parse(run.id)),
    })
    return { proposal: accepted, runs }
  }
}
