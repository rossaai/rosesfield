import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

type Logs = { invocation_logs?: boolean }

type Deployment = { observability?: { enabled?: boolean; logs?: Logs } }

type Config = Deployment & { env: Record<string, Deployment> }

function deploymentConfig(): Config {
  const text = readFileSync(
    new URL("../../wrangler.jsonc", import.meta.url),
    "utf8"
  )
  const lines = text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
  return JSON.parse(lines.join("\n")) as Config
}

describe("the request logs Cloudflare keeps", () => {
  it("leave out each request's record, so a key sent in a header never reaches a log", () => {
    const config = deploymentConfig()
    const deployments = [config, ...Object.values(config.env)]
    for (const deployment of deployments) {
      const observability = deployment.observability ?? config.observability
      expect(observability?.logs?.invocation_logs).toBe(false)
    }
  })
})
