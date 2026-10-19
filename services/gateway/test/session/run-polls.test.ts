import { buildPath, routes, runResponse } from "@rosesfield/contract"
import type { Fetch } from "@rosesfield/generation"
import { afterEach, describe, expect, it } from "vitest"
import { keyHeaders } from "#session/visitor-keys"
import { fakeComfy } from "../fixtures/comfy-fetch"
import { type OpenedGateway, openGateway } from "../fixtures/public-gateway"

let opened: OpenedGateway | null = null

afterEach(async () => {
  await opened?.close()
  opened = null
})

function slowSubmits(): ReturnType<typeof fakeComfy> {
  const comfy = fakeComfy()
  const fetch: Fetch = async (input, init) => {
    const request = new Request(
      input instanceof Request ? input.url : String(input),
      init
    )
    if (request.method === "POST" && request.url.endsWith("/api/v2/jobs")) {
      await new Promise((resolve) => setTimeout(resolve, 40))
    }
    return comfy.fetch(input, init)
  }
  return { fetch, calls: comfy.calls }
}

describe("a run read by two requests at once", () => {
  it("is submitted once and keeps working", async () => {
    opened = openGateway({ comfy: slowSubmits() })
    const visitor = opened.visitor({ [keyHeaders.engine]: "comfyui-polls" })
    const started = runResponse.parse(
      await (
        await visitor.call(
          buildPath(routes.startRun.path, { appId: "sample-image" }),
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ inputs: { prompt: "a red door" } }),
          }
        )
      ).json()
    ).run
    const path = buildPath(routes.getRun.path, { runId: started.id })

    const both = await Promise.all([visitor.call(path), visitor.call(path)])
    const runs = await Promise.all(
      both.map(async (response) => runResponse.parse(await response.json()).run)
    )

    expect(runs.map((run) => run.status)).not.toContain("failed")
    expect(
      opened.comfy.calls.filter(
        (call) => call.method === "POST" && call.path === "/api/v2/jobs"
      )
    ).toHaveLength(1)
  })
})
