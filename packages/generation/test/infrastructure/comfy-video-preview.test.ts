import { describe, expect, it } from "vitest"
import type { EngineOutput } from "#domain/generation-engine.port"
import {
  type ListedOutput,
  withVideoStills,
} from "#infrastructure/comfy/comfy-video-stills"
import { stillsOf, videoBytesOf, videoOutput } from "../video-fixtures"

function stillListed(index: number): ListedOutput {
  return {
    node_id: `9${index}`,
    name: `rosesfield-stills/rosesfield-still-75-${index}_00001_.png`,
    type: "image",
  }
}

function stillOutput(bytes: Uint8Array): EngineOutput {
  return {
    kind: "image",
    mime: "image/png",
    bytes,
    width: 168,
    height: 298,
    durationSeconds: null,
  }
}

const videoListed: ListedOutput = {
  node_id: "75",
  name: "video/rosesfield-effects_00001_.mp4",
  type: "video",
}

async function listedWith(stills: readonly Uint8Array[]) {
  const video = videoOutput(await videoBytesOf("test-pattern"))
  return withVideoStills(
    [videoListed, ...stills.map((_, index) => stillListed(index))],
    [video, ...stills.map(stillOutput)]
  )
}

describe("a graph video's preview", () => {
  it("is the first of its five stills that is not black", async () => {
    const black = await stillsOf("melt-away-black")
    const lit = await stillsOf("test-pattern")
    const stills = [black[0], black[1], lit[2], lit[3], lit[4]].flatMap(
      (still) => (still === undefined ? [] : [still])
    )
    const [video] = await listedWith(stills)
    expect(video?.stills).toEqual(stills)
    expect(video?.preview).toEqual({ mime: "image/png", bytes: lit[2] })
  })

  it("is the first still when it is lit", async () => {
    const lit = await stillsOf("test-pattern")
    const [video] = await listedWith(lit)
    expect(video?.preview?.bytes).toEqual(lit[0])
  })

  it("is absent when every still is black, so the run drops the video", async () => {
    const [video] = await listedWith(await stillsOf("melt-away-black"))
    expect(video?.stills).toHaveLength(5)
    expect(video).not.toHaveProperty("preview")
  })

  it("is absent when the lit still passes 64 KB", async () => {
    const black = await stillsOf("melt-away-black")
    const big = new Uint8Array(64 * 1024 + 1)
    const lit = await stillsOf("test-pattern")
    big.set(lit[0] ?? new Uint8Array(0))
    const [video] = await listedWith([big, ...black.slice(1)])
    expect(video).not.toHaveProperty("preview")
  })
})
