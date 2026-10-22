import { type Run, run } from "@rosesfield/contract"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import type { VisualEntry } from "@/screens/explore/explore-tile"
import { clipSourcesOf } from "@/screens/explore/share-sources"
import { ResultPanel } from "@/viewer/result-panel"

const runId = "5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a01"
const outputs = [
  "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  "1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e",
]
const look = "late afternoon light"
const scenes = ["a girl opens a bakery door", "she kneads dough"]

function storyboardRun(): Run {
  return run.parse({
    id: runId,
    appId: "storyboard",
    status: "done",
    inputs: {
      sceneCount: "2",
      scene1: scenes[0],
      scene2: scenes[1],
      look,
    },
    count: 2,
    aspectRatio: "16:9",
    seed: 7,
    outputs,
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-20T12:00:00.000Z",
    finishedAt: "2026-10-20T12:00:20.000Z",
  })
}

function entryFor(made: Run, assetId: string): VisualEntry {
  return {
    key: `run-${made.id}-${assetId}`,
    run: made,
    kind: "image",
    aspect: { width: 16, height: 9 },
    source: { kind: "own", assetId },
  }
}

function sharedEntry(made: Run): VisualEntry {
  return {
    key: `share-${made.id}`,
    run: { ...made, outputs: [] },
    kind: "image",
    aspect: { width: 16, height: 9 },
    source: { kind: "share", shareId: "abc", src: "/share/abc/media/0" },
  }
}

function Frame({ children }: { children: ReactElement }): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { enabled: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function detailsOf(entry: VisualEntry): string {
  const { container } = render(
    <Frame>
      <ResultPanel
        entry={entry}
        isDownloading={false}
        onRecreate={vi.fn()}
        onDownload={vi.fn()}
      />
    </Frame>
  )
  return (
    container.querySelector("[data-slot=viewer-details]")?.textContent ?? ""
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("the result panel's prompt for a Storyboard keyframe", () => {
  it("shows keyframe 2's own scene and the look", () => {
    const text = detailsOf(entryFor(storyboardRun(), outputs[1] ?? ""))
    expect(text).toContain(`${scenes[1]} ${look}`)
    expect(text).not.toContain(scenes[0] ?? "")
  })

  it("shows keyframe 1's own scene and the look", () => {
    const text = detailsOf(entryFor(storyboardRun(), outputs[0] ?? ""))
    expect(text).toContain(`${scenes[0]} ${look}`)
    expect(text).not.toContain(scenes[1] ?? "")
  })

  it("shows scene 1 for a shared run, whose first media is keyframe 1", () => {
    const text = detailsOf(sharedEntry(storyboardRun()))
    expect(text).toContain(scenes[0] ?? "")
    expect(text).not.toContain(scenes[1] ?? "")
  })
})

describe("the share clip's words for a Storyboard keyframe", () => {
  it("writes keyframe 2's own scene and the look when the run has no input image", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(Uint8Array.of(137, 80, 78, 71), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        })
    )
    Object.assign(URL, {
      createObjectURL: () => "blob:keyframe",
      revokeObjectURL: () => undefined,
    })
    const sources = await clipSourcesOf(storyboardRun(), outputs[1] ?? "", [])
    expect(sources.plan.input).toEqual({
      kind: "text",
      text: `${scenes[1]} ${look}`,
    })
  })
})
