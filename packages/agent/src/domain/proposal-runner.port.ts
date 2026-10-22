import type { Run, RunRequest } from "@rosesfield/contract"
import type { AppId } from "@rosesfield/kernel"

export type ProposedRuns = {
  appId: AppId
  request: RunRequest
  body: unknown
  key: string
}

export abstract class ProposalRunner {
  /** Starts every run an accepted proposal asks for: one per scene for Storyboard, one for any other app. */
  abstract start(proposed: ProposedRuns): Promise<Run[]>
}
