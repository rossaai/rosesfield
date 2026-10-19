import type { Proposal } from "#agent.contract"
import type { AgentHarness, ProposalRef } from "#domain/agent-harness.port"
import { conversationIdFormat } from "#domain/conversation.id"
import { AgentModelMissingError } from "#domain/error/agent-model-missing.error"
import { ProposalSettledError } from "#domain/error/proposal-settled.error"
import { proposalIdFormat } from "#domain/proposal.id"

export type SkipProposalInput = {
  conversationId: string
  proposalId: string
}

export type SkipProposalOutput = {
  proposal: Proposal
}

type SkipProposalHandlerOptions = {
  agent: AgentHarness | null
}

export class SkipProposalHandler {
  private readonly agent: AgentHarness | null

  constructor(options: SkipProposalHandlerOptions) {
    this.agent = options.agent
  }

  async execute(input: SkipProposalInput): Promise<SkipProposalOutput> {
    const agent = this.agent
    if (agent === null) {
      throw new AgentModelMissingError()
    }
    const ref: ProposalRef = {
      conversationId: conversationIdFormat.parse(input.conversationId),
      proposalId: proposalIdFormat.parse(input.proposalId),
    }
    const { proposal } = await agent.readProposal(ref)
    if (proposal.status === "accepted") {
      throw new ProposalSettledError({
        proposalId: proposal.id,
        status: proposal.status,
      })
    }
    if (proposal.status === "skipped") {
      return { proposal }
    }
    return { proposal: await agent.settleProposal(ref, { status: "skipped" }) }
  }
}
