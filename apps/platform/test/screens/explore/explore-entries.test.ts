import { type Run, run, shareView } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import {
  admittedEntries,
  sharedEntries,
} from "@/screens/explore/explore-entries"
import type { ExploreAdmission } from "@/screens/explore/explore-list"
import type { ExploreEntry } from "@/screens/explore/explore-tile"
import { sharedOutputOf } from "@/screens/explore/share-api"

const outputId = "3d4e5f6a-7b8c-4d9e-8f0a-2b3c4d5e6f01"

function runOf(change: Partial<Record<keyof Run, unknown>>): Run {
  return run.parse({
    id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e01",
    appId: "image",
    status: "done",
    inputs: { prompt: "a red rose" },
    count: 1,
    aspectRatio: "1:1",
    seed: 1,
    outputs: [outputId],
    progress: 1,
    engine: { adapter: "comfy-workflow", models: [], workflowHash: null },
    cost: { amount: 0.006, currency: "USD" },
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T12:00:00.000Z",
    finishedAt: "2026-10-19T12:00:05.000Z",
    ...change,
  })
}

function sharesOf(runs: readonly Run[]): ExploreEntry[] {
  return sharedEntries(
    runs.map((made) =>
      sharedOutputOf(
        shareView.parse({
          id: `share-${made.id.slice(-2)}`,
          path: `/share/share-${made.id.slice(-2)}`,
          run: made,
          media: [
            {
              index: 0,
              kind: "image",
              mime: "image/png",
              width: 1,
              height: 1,
              durationSeconds: null,
            },
          ],
          createdAt: "2026-10-19T12:00:00.000Z",
          expiresAt: null,
        })
      )
    )
  )
}

describe("Explore's outputs", () => {
  it("read a shared output from the gateway, with the address of its media", () => {
    const share = shareView.safeParse({
      id: "abc",
      path: "/share/abc",
      run: runOf({ outputs: [] }),
      media: [
        {
          index: 0,
          kind: "video",
          mime: "video/mp4",
          width: 1280,
          height: 720,
          durationSeconds: 5,
        },
      ],
      createdAt: "2026-10-19T12:00:00.000Z",
      expiresAt: null,
    })
    const [entry] = sharedEntries(
      share.success ? [sharedOutputOf(share.data)] : []
    )

    expect(entry?.kind).toBe("video")
    expect(entry?.source).toEqual({
      kind: "share",
      shareId: "abc",
      src: "/share/abc/media/0",
    })
    expect(entry?.aspect).toEqual({ width: 1280, height: 720 })
    expect(shareView.safeParse({ id: "abc", path: "/share/abc" }).success).toBe(
      false
    )
  })

  it("show a result only when the Explore list admits its run with a yes", () => {
    const admitted = runOf({})
    const unlisted = runOf({ id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e09" })
    const entries = admittedEntries(sharesOf([admitted, unlisted]), [
      admissionOf(admitted.id),
    ])

    expect(entries.map((entry) => entry.run.id)).toEqual([admitted.id])
    expect(admittedEntries(sharesOf([admitted]), [])).toEqual([])
  })

  it("keep out a run whose input shows a person without consent, or a brand", () => {
    const made = sharesOf([runOf({})])
    const id = made[0]?.run.id
    const other = admissionOf(id, { people: "other" })
    const brand = admissionOf(id, { brand: true })
    const operator = admissionOf(id, { people: "operator" })

    expect(admittedEntries(made, [other])).toEqual([])
    expect(admittedEntries(made, [brand])).toEqual([])
    expect(admittedEntries(made, [operator])).toHaveLength(1)
  })

  it("keep out MiniMax H3 and Wan from open weights, and keep H3 from the API", () => {
    const weights = runOf({
      engine: {
        adapter: "comfy-workflow",
        models: ["minimax_h3_bf16.safetensors"],
        workflowHash: null,
      },
    })
    const wan = runOf({
      engine: {
        adapter: "comfy-workflow",
        models: ["wan2.1_i2v_480p.safetensors"],
        workflowHash: null,
      },
    })
    const hosted = runOf({
      engine: {
        adapter: "hosted-model",
        models: ["minimax/h3"],
        workflowHash: null,
      },
    })

    expect(
      admittedEntries(sharesOf([weights]), [admissionOf(weights.id)])
    ).toEqual([])
    expect(admittedEntries(sharesOf([wan]), [admissionOf(wan.id)])).toEqual([])
    expect(
      admittedEntries(sharesOf([hosted]), [
        admissionOf(hosted.id, { source: "own-minimax-api" }),
      ])
    ).toHaveLength(1)
  })

  it("show an admitted run once when two shares hold it", () => {
    const made = runOf({})
    const share = shareView.parse({
      id: "abc",
      path: "/share/abc",
      run: made,
      media: [
        {
          index: 0,
          kind: "image",
          mime: "image/png",
          width: 1,
          height: 1,
          durationSeconds: null,
        },
      ],
      createdAt: "2026-10-19T12:00:00.000Z",
      expiresAt: null,
    })
    const entries = admittedEntries(
      [...sharedEntries([sharedOutputOf(share)]), ...sharesOf([made])],
      [admissionOf(made.id)]
    )

    expect(entries.map((entry) => entry.key)).toEqual(["share-abc"])
  })
})

function admissionOf(
  runId: string | undefined,
  change: Partial<ExploreAdmission> = {}
): ExploreAdmission {
  return {
    runId: runId ?? "",
    source: "own-open-weights",
    yes: "2026-10-20",
    people: "none",
    brand: false,
    ...change,
  }
}
