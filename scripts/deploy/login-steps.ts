import { accountSteps } from "./account-steps"
import type { DeployOptions } from "./deploy-options"
import { type DeployTarget, deployTargets } from "./deploy-targets"
import { localSteps } from "./local-steps"
import type { LoginStep } from "./login-step"
import { remoteSteps } from "./remote-steps"

export function loginStepsOf(options: DeployOptions): LoginStep[] {
  const targets: DeployTarget[] = options.isJudge
    ? [deployTargets.public, deployTargets.judge]
    : [deployTargets.public]
  return [
    { text: "bun run build", run: (_, tools) => tools.build() },
    ...accountSteps(options),
    ...targets.flatMap((target) =>
      options.isLocal
        ? localSteps(options, target)
        : remoteSteps(options, target)
    ),
  ]
}
