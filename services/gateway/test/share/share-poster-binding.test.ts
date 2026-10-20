import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

type Deployment = { media?: { binding: string } }

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

describe("the media binding a shared video's poster needs", () => {
  it("is declared as MEDIA by the public deployment and by every named one", () => {
    const config = deploymentConfig()
    const deployments = [config, ...Object.values(config.env)]

    expect(deployments.length).toBeGreaterThan(1)
    for (const deployment of deployments) {
      expect(deployment.media).toEqual({ binding: "MEDIA" })
    }
  })
})
