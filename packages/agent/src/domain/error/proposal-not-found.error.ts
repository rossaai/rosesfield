import { NotFoundError } from "@rosesfield/kernel"

type ProposalNotFoundErrorOptions = {
  proposalId: string
}

export class ProposalNotFoundError extends NotFoundError {
  override readonly code = "PROPOSAL_NOT_FOUND"

  constructor(options: ProposalNotFoundErrorOptions) {
    super({ message: `No proposal has the id ${options.proposalId}` })
  }
}
