import { spawnSync } from "node:child_process"
import { delimiter, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const gatewayRoot = fileURLToPath(new URL("..", import.meta.url))
const vitestEntry = join(
  gatewayRoot,
  "..",
  "..",
  "node_modules",
  "vitest",
  "vitest.mjs"
)
const laneTimeoutMs = 240_000

function isBunSetting(name: string): boolean {
  return (
    name === "NODE" || name === "npm_node_execpath" || name.startsWith("VITEST")
  )
}

function nodeEnv(): Record<string, string> {
  const kept: [string, string][] = []
  for (const [name, value] of Object.entries(process.env)) {
    if (value !== undefined && !isBunSetting(name)) {
      kept.push([name, value])
    }
  }
  const path = (process.env.PATH ?? "")
    .split(delimiter)
    .filter((entry) => !entry.includes("bun-node"))
    .join(delimiter)
  return { ...Object.fromEntries(kept), PATH: path, NO_COLOR: "1" }
}

describe("the Worker lane", () => {
  it(
    "passes in workerd, run by vitest on node because workerd answers no request under the bun runtime",
    () => {
      const lane = spawnSync(
        "node",
        [vitestEntry, "run", "--config", "vitest.worker.config.ts"],
        {
          cwd: gatewayRoot,
          encoding: "utf8",
          timeout: laneTimeoutMs,
          env: nodeEnv(),
        }
      )
      const output = `${lane.stdout}\n${lane.stderr}`
      expect(lane.status, output).toBe(0)
      expect(output).toMatch(/Tests\s+\d+ passed/)
      expect(output).not.toMatch(/skipped/)
    },
    laneTimeoutMs + 10_000
  )
})
