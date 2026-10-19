import type { HostedModel } from "#domain/generation-engine.port"
import { ModelPolicy } from "#domain/model-policy.port"

export class FakeModelPolicy extends ModelPolicy {
  private readonly offered: readonly string[]

  constructor(offered: readonly string[]) {
    super()
    this.offered = offered
  }

  override allows(_tasks: readonly string[], model: HostedModel): boolean {
    return this.offered.includes(model.id)
  }
}
