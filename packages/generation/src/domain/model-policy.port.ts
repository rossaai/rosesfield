import type { HostedModel } from "#domain/generation-engine.port"

export abstract class ModelPolicy {
  /** Says whether an app that lists these tasks and makes this media may run this hosted model. */
  abstract allows(
    tasks: readonly string[],
    model: HostedModel,
    media: string
  ): boolean
}
