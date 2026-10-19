import { describe, expect, it } from "vitest"
import type { RouteDefinition } from "#route.contract"
import { buildPath } from "#route.contract"
import { routes } from "#route-manifest.contract"
import { runUuid, sampleRun } from "./sample"

const entries: [string, RouteDefinition][] = Object.entries(routes)

function paramNames(path: string): string[] {
  return path
    .split("/")
    .filter((segment) => segment.startsWith(":"))
    .map((segment) => segment.slice(1))
}

describe("routes", () => {
  it.each(entries)(
    "%s declares a schema for each param in its path",
    (_, route) => {
      const declared =
        route.params === null ? [] : Object.keys(route.params.shape)
      expect(declared.sort()).toEqual(paramNames(route.path).sort())
    }
  )

  it("gives every route its own method and path", () => {
    const keys = entries.map(([, route]) => `${route.method} ${route.path}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it.each(entries)(
    "%s answers 204 exactly when it has no response",
    (_, route) => {
      expect(route.status === 204).toBe(route.response === null)
    }
  )

  it.each(
    entries.filter(
      ([, route]) => route.method === "GET" || route.method === "DELETE"
    )
  )("%s sends no body", (_, route) => {
    expect(route.body).toBeNull()
  })

  it("builds the path of one run from the manifest", () => {
    expect(buildPath(routes.getRun.path, { runId: runUuid })).toBe(
      `/api/runs/${runUuid}`
    )
  })

  it("parses the run response the gateway sends", () => {
    const response = routes.getRun.response.parse({ run: sampleRun() })
    expect(response.run.id).toBe(runUuid)
  })
})
