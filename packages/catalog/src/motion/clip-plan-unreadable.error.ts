import { DependencyError } from "@rosesfield/kernel"

export class ClipPlanUnreadableError extends DependencyError {
  override readonly code = "MOTION_PLAN_UNREADABLE"

  constructor(options: { cause: unknown }) {
    super({ message: "The plan of the clip could not be read", ...options })
  }
}
