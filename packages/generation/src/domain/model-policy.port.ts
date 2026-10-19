import type { HostedModel } from "#domain/generation-engine.port"

export abstract class ModelPolicy {
  /** Says whether an app that lists these tasks may run this hosted model. */
  abstract allows(tasks: readonly string[], model: HostedModel): boolean
}
