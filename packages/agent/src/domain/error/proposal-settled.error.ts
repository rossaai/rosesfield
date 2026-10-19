import { ConflictError } from "@rosesfield/kernel"

type ProposalSettledErrorOptions = {
  proposalId: string
  status: string
}

export class ProposalSettledError extends ConflictError {
  override readonly code = "PROPOSAL_SETTLED"

  constructor(options: ProposalSettledErrorOptions) {
    super({
      message: `The proposal ${options.proposalId} is already ${options.status}`,
    })
  }
}
