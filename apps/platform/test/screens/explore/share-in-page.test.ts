import { afterEach, describe, expect, it } from "vitest"
import { shareInPage } from "@/screens/explore/share-api"

const share = {
  id: "abc",
  path: "/share/abc",
  run: {
    id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
    appId: "image",
    status: "done",
    inputs: { prompt: "a red rose" },
    count: 1,
    aspectRatio: "1:1",
    seed: 1,
    outputs: [],
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T12:00:00.000Z",
    finishedAt: "2026-10-19T12:00:05.000Z",
  },
  media: [
    {
      index: 0,
      kind: "image",
      mime: "image/png",
      width: null,
      height: null,
      durationSeconds: null,
    },
  ],
  poster: "/share/abc/poster",
  createdAt: "2026-10-19T12:00:00.000Z",
  expiresAt: null,
}

function pageWith(body: unknown): void {
  const tag = document.createElement("script")
  tag.id = "rosesfield-share"
  tag.type = "application/json"
  tag.textContent = JSON.stringify(body)
  document.head.append(tag)
}

afterEach(() => {
  document.getElementById("rosesfield-share")?.remove()
})

describe("a shared result's page data", () => {
  it("gives the app the share the page was served with", () => {
    pageWith({ share })
    expect(shareInPage("abc")?.media[0]?.src).toBe("/share/abc/media/0")
  })

  it("gives nothing for another share, or with no data in the page", () => {
    expect(shareInPage("abc")).toBeUndefined()
    pageWith({ share })
    expect(shareInPage("other")).toBeUndefined()
  })
})
