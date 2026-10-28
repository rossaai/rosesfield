import type { DeployOptions } from "./deploy-options"
import type { LoginStep, StepTools } from "./login-step"
import type { WranglerSession } from "./wrangler-session"

type CloudflareAccount = {
  id: string
  name: string
}

export function accountSteps(options: DeployOptions): LoginStep[] {
  if (options.isLocal) {
    return [
      {
        text: "sign in: the local runtime needs no account",
        run: (session, tools) => tools.login(session),
      },
    ]
  }
  return [
    {
      text: "wrangler login, with its config in a new temporary folder: sign in to the account you deploy to, in the browser",
      run: (session, tools) => tools.login(session),
    },
    {
      text:
        options.account === null
          ? "wrangler whoami --json: shows the account name and id, and you type yes to deploy to it"
          : `wrangler whoami --json: the signed-in account must include ${options.account}`,
      run: (session, tools) => confirmAccount(session, tools, options),
    },
  ]
}

async function confirmAccount(
  session: WranglerSession,
  tools: StepTools,
  options: DeployOptions
): Promise<void> {
  const accounts = await accountsOf(session)
  const wanted = options.account
  if (wanted !== null) {
    const match = accounts.find((account) => account.id === wanted)
    if (match === undefined) {
      throw new Error(
        `The signed-in account does not reach --account ${wanted}. It reaches ${listOf(accounts)}. Nothing was created.`
      )
    }
    tools.print(`Deploying to ${match.name} (${match.id}), as --account names.`)
    return
  }
  const [only] = accounts
  if (only === undefined || accounts.length > 1) {
    throw new Error(
      `The signed-in account reaches ${listOf(accounts)}. Run again with --account <id>. Nothing was created.`
    )
  }
  tools.print(`\nSigned in to ${only.name} (${only.id}).`)
  const answer = await tools.ask(
    `Type yes to create and deploy Rosesfield in ${only.name}: `
  )
  if (answer.trim() !== "yes") {
    throw new Error("You did not type yes. Nothing was created.")
  }
}

async function accountsOf(
  session: WranglerSession
): Promise<CloudflareAccount[]> {
  const shown = await session.read(["whoami", "--json"])
  if (shown.status !== 0) {
    throw new Error(`wrangler whoami stopped with ${shown.status}`)
  }
  const start = shown.output.indexOf("{")
  const parsed: unknown = JSON.parse(
    start < 0 ? "{}" : shown.output.slice(start)
  )
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("accounts" in parsed) ||
    !Array.isArray(parsed.accounts)
  ) {
    throw new Error("wrangler whoami named no account.")
  }
  return parsed.accounts.flatMap((entry: unknown) =>
    typeof entry === "object" &&
    entry !== null &&
    "id" in entry &&
    "name" in entry &&
    typeof entry.id === "string" &&
    typeof entry.name === "string"
      ? [{ id: entry.id, name: entry.name }]
      : []
  )
}

function listOf(accounts: readonly CloudflareAccount[]): string {
  return accounts.length === 0
    ? "no account"
    : accounts.map((account) => `${account.name} (${account.id})`).join(", ")
}
