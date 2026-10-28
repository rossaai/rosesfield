import { resolve } from "node:path"

export type DeployOptions = {
  isJudge: boolean
  isLocal: boolean
  isDryRun: boolean
  isLogin: boolean
  port: string
  envFiles: string[]
  domain: string | null
  cap: string | null
  account: string | null
}

const hostnamePattern =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

const capPattern = /^[1-9][0-9]{0,6}$/

const accountPattern = /^[0-9a-f]{32}$/

export const deployUsage = [
  "bun run deploy [--login] [--judge --cap <credits>] [--dry-run] [--domain <host>] [--account <id>] [--local [--port <port>] [--env-file <file>]...]",
  "",
  "  --login     signs in to Cloudflare in a session of its own, creates what is missing, deploys, checks the live address and signs out",
  "  --judge     also a private owner link: owner mode on one Comfy key, with a spend cap",
  "  --cap       the spend cap of the owner link in Comfy credits. --login --judge needs it",
  "  --domain    a domain of your Cloudflare account the deployment also answers on, such as rosesfield.com. Its workers.dev address keeps answering",
  "  --account   the Cloudflare account id to deploy to, when your sign-in reaches more than one account",
  "  --local     builds and runs the deployment in wrangler's local runtime instead of Cloudflare",
  "  --dry-run   prints each step in order and runs none",
  "  --port      the local port, 8788 by default",
  "  --env-file  a file of settings for the local runtime, such as SESSION_SECRET, OWNER_TOKEN or COMFY_API_KEY",
].join("\n")

export function deployOptionsOf(args: readonly string[]): DeployOptions {
  const options: DeployOptions = {
    isJudge: false,
    isLocal: false,
    isDryRun: false,
    isLogin: false,
    port: "8788",
    envFiles: [],
    domain: null,
    cap: null,
    account: null,
  }
  for (let index = 0; index < args.length; index += 1) {
    const isValue = readFlag(options, args[index])
    if (!isValue) {
      readValue(options, args[index], args[index + 1])
      index += 1
    }
  }
  checkCombination(options)
  return options
}

function readFlag(options: DeployOptions, arg: string | undefined): boolean {
  if (arg === "--judge") {
    options.isJudge = true
  } else if (arg === "--local") {
    options.isLocal = true
  } else if (arg === "--dry-run") {
    options.isDryRun = true
  } else if (arg === "--login") {
    options.isLogin = true
  } else {
    return false
  }
  return true
}

function readValue(
  options: DeployOptions,
  arg: string | undefined,
  value: string | undefined
): void {
  if (value === undefined) {
    refuse(`${arg} is not an option, or it needs a value.`)
  } else if (arg === "--port") {
    options.port = value
  } else if (arg === "--env-file") {
    options.envFiles.push(resolve(value))
  } else if (arg === "--domain") {
    options.domain = matched(value, hostnamePattern, "a domain").toLowerCase()
  } else if (arg === "--cap") {
    options.cap = matched(value, capPattern, "a whole number of credits")
  } else if (arg === "--account") {
    options.account = matched(value, accountPattern, "a Cloudflare account id")
  } else {
    refuse(`${arg} is not an option.`)
  }
}

function checkCombination(options: DeployOptions): void {
  if (options.isLocal && options.domain !== null) {
    refuse(
      "--domain puts a Cloudflare deployment on a domain, and --local runs none."
    )
  }
  if (options.cap !== null && !options.isJudge) {
    refuse("--cap sets the spend cap of the owner link, which --judge deploys.")
  }
  if (options.isLogin && options.isJudge && options.cap === null) {
    refuse("--login --judge needs --cap <credits>, the owner link's spend cap.")
  }
  if (options.isLogin && options.envFiles.length > 0) {
    refuse("--login makes its own secrets and reads no --env-file.")
  }
  if (!options.isLogin && options.account !== null) {
    refuse("--account names the account --login signs in to.")
  }
}

function matched(value: string, pattern: RegExp, what: string): string {
  if (!pattern.test(value.toLowerCase())) {
    refuse(`${value} is not ${what}.`)
  }
  return value
}

function refuse(reason: string): never {
  throw new Error(`${reason}\n\n${deployUsage}`)
}
