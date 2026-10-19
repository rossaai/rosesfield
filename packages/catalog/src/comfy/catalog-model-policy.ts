import { type HostedModel, ModelPolicy } from "@rosesfield/generation/bindings"
import { isDeniedModel } from "#comfy/model-deny"
import { tasksOfModel } from "#comfy/model-tasks"

export class CatalogModelPolicy extends ModelPolicy {
  override allows(tasks: readonly string[], model: HostedModel): boolean {
    return (
      !isDeniedModel(model.id) &&
      tasksOfModel(model.id, model.takes, model.makes).some((task) =>
        tasks.includes(task)
      )
    )
  }
}
