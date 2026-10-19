import { type Brand, IdFormat } from "@rosesfield/kernel"

export type ProposalId = Brand<string, "ProposalId">

export const proposalIdFormat: IdFormat<ProposalId> = new IdFormat<ProposalId>({
  name: "proposal id",
  pattern: IdFormat.uuidPattern,
})
