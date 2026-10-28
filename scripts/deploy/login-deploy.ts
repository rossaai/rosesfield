import type { DeployOptions } from "./deploy-options"
import { deployTargets } from "./deploy-targets"
import { type LoginStep, loginStepsOf, type StepTools } from "./login-steps"
import type { ProcessShell } from "./process-shell"
import { WranglerSession } from "./wrangler-session"

export type Account = {
  login(session: WranglerSession): Promise<void>
  logout(session: WranglerSession): Promise<void>
}

export type LoginDeployDeps = Omit<StepTools, "login"> & {
  shell: ProcessShell
  account: Account
  wrangler: readonly string[]
  makeFolder: () => string
  removeFolder: (folder: string) => void
  signal: AbortSignal
}

export const wranglerAccount: Account = {
  async login(session) {
    await session.run(["login"], { isPrompt: true })
  },
  async logout(session) {
    await session.run(["logout"])
  },
}

const closingText =
  "finally, even when a step fails: sign out, then delete the temporary folder"

export async function loginDeploy(
  options: DeployOptions,
  deps: LoginDeployDeps
): Promise<void> {
  const steps = loginStepsOf(options)
  if (options.isDryRun) {
    printSteps(steps, deps)
    return
  }
  const folder = deps.makeFolder()
  let session: WranglerSession | null = null
  try {
    session = new WranglerSession({
      folder,
      wrangler: deps.wrangler,
      shell: deps.shell,
      options,
    })
    await runSteps(session, steps, deps)
  } finally {
    await close(session, folder, deps)
  }
  printResult(session, options, deps)
}

function printSteps(steps: readonly LoginStep[], deps: LoginDeployDeps): void {
  steps.forEach((step, index) => {
    deps.print(`${index + 1}. ${step.text}`)
  })
  deps.print(`${steps.length + 1}. ${closingText}`)
}

async function runSteps(
  session: WranglerSession,
  steps: readonly LoginStep[],
  deps: LoginDeployDeps
): Promise<void> {
  const tools: StepTools = {
    ...deps,
    login: (current) => deps.account.login(current),
  }
  for (const [index, step] of steps.entries()) {
    if (deps.signal.aborted) {
      throw new Error("Stopped before the next step.")
    }
    deps.print(`\n${index + 1}/${steps.length}. ${step.text}`)
    await step.run(session, tools)
  }
}

async function close(
  session: WranglerSession | null,
  folder: string,
  deps: LoginDeployDeps
): Promise<void> {
  try {
    if (session !== null) {
      deps.print(`\n${closingText}`)
      await deps.account.logout(session)
    }
  } catch (error) {
    deps.print(
      `wrangler logout failed: ${error instanceof Error ? error.message : error}. The folder that held the sign-in is deleted next.`
    )
  } finally {
    deps.removeFolder(folder)
  }
}

function printResult(
  session: WranglerSession | null,
  options: DeployOptions,
  deps: LoginDeployDeps
): void {
  const publicAddress = session?.addresses.get("public")
  if (publicAddress !== undefined) {
    deps.print(`\nRosesfield answers at ${publicAddress}`)
  }
  const judgeAddress = session?.addresses.get("judge")
  if (!options.isJudge || judgeAddress === undefined) {
    return
  }
  const token = session?.secrets.get(deployTargets.judge.secret)
  deps.print(
    token === undefined
      ? `The owner link is ${judgeAddress}/#token=<the OWNER_TOKEN set before>. This run kept that token.`
      : `The owner link, printed once: ${judgeAddress}/#token=${token}`
  )
}
