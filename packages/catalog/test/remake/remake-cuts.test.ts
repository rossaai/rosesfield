import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { cutFinder, type FrameScore, shotsOf } from "#remake/cut-finder"
import {
  middleFramesArgsOf,
  planFrameNameOf,
  sceneScoreArgsOf,
  sceneScoresOf,
} from "#remake/ffmpeg/ffmpeg-cuts"
import {
  checkShots,
  editSecondsOf,
  type FoundShot,
  framesOf,
  middleFrameOf,
  shotFramesOf,
  shotProblemCopyOf,
} from "#remake/shot-plan"

const printed = readFileSync(
  new URL("./fixtures/three-shot-scene-scores.txt", import.meta.url),
  "utf8"
)

function flat(frameCount: number, cuts: readonly number[]): FrameScore[] {
  return Array.from({ length: frameCount }, (_, frame) => ({
    frame,
    score: cuts.includes(frame) ? 0.8 : 0.02,
  }))
}

function evenShots(count: number, frames: number): FoundShot[] {
  return shotsOf(
    flat(
      count * frames,
      Array.from({ length: count - 1 }, (_, index) => (index + 1) * frames)
    ),
    count * frames
  )
}

describe("Remake finds the hard cuts of a reference", () => {
  it("reads ffmpeg's printed scene scores of a 6 second edit of 3 shots at 30 frames per second as 144 frames at 24", () => {
    const { scores, frameCount } = sceneScoresOf(printed)
    expect(frameCount).toBe(144)
    expect(scores).toHaveLength(144)
    expect(shotsOf(scores, frameCount)).toEqual([
      { number: 1, startSeconds: 0, endSeconds: 2 },
      { number: 2, startSeconds: 2, endSeconds: 3.5 },
      { number: 3, startSeconds: 3.5, endSeconds: 6 },
    ])
  })

  it("control: the same scores under a threshold above every cut make one shot, which the shot check refuses", () => {
    const { scores, frameCount } = sceneScoresOf(printed)
    const lowered = scores.map((one) => ({ ...one, score: one.score / 4 }))
    const shots = shotsOf(lowered, frameCount)
    expect(shots).toHaveLength(1)
    expect(checkShots(shots)).toEqual({ code: "shotCount", count: 1 })
  })

  it("keeps one cut where two land closer than its gap, and none at the first or last frames", () => {
    const scores = flat(96, [2, 48, 48 + cutFinder.shortestGapFrames - 1, 94])
    expect(shotsOf(scores, 96)).toEqual([
      { number: 1, startSeconds: 0, endSeconds: 2 },
      { number: 2, startSeconds: 2, endSeconds: 4 },
    ])
  })

  it("asks ffmpeg for every frame's scene score on the 24 frames per second grid", () => {
    const args = sceneScoreArgsOf("reference.mp4")
    expect(args[0]).toBe("ffmpeg")
    expect(args).toContain("fps=24,select='gte(scene,0)',metadata=print:file=-")
    expect(args.slice(-3)).toEqual(["-f", "null", "-"])
  })

  it("takes the middle frame of every shot for the plan in one command, each at a long side of 768 or less", () => {
    const shot = { number: 2, startSeconds: 2, endSeconds: 3.5 }
    expect(middleFrameOf(shot)).toBe(66)
    const args = middleFramesArgsOf({ reference: "r.mp4", frames: [24, 66] })
    expect(args.filter((arg) => arg === "-i")).toHaveLength(1)
    expect(args[args.indexOf("-vf") + 1]).toBe(
      "fps=24,select='eq(n,24)+eq(n,66)',scale=w='min(768,iw)':h='min(768,ih)':force_original_aspect_ratio=decrease"
    )
    expect(args[args.indexOf("-frames:v") + 1]).toBe("2")
    expect(args.at(-1)).toBe("frame-%d.jpg")
    expect([0, 1].map(planFrameNameOf)).toEqual(["frame-1.jpg", "frame-2.jpg"])
  })
})

describe("Remake ends a run whose edit breaks a shot limit, before any shot", () => {
  it("names the 1 shot of an edit with one shot", () => {
    const problem = checkShots(evenShots(1, 72))
    expect(problem).toEqual({ code: "shotCount", count: 1 })
    expect(problem && shotProblemCopyOf(problem)).toEqual({
      titleKey: "remake.error.shotCount.title.one",
      bodyKey: "remake.error.shotCount.body",
      values: { count: 1 },
    })
  })

  it("names the 9 shots of an edit with nine", () => {
    const problem = checkShots(evenShots(9, 24))
    expect(problem && shotProblemCopyOf(problem)).toEqual({
      titleKey: "remake.error.shotCount.title.other",
      bodyKey: "remake.error.shotCount.body",
      values: { count: 9 },
    })
  })

  it("names shot 2 of 7 seconds and the 1 to 5 second limit", () => {
    const shots = shotsOf(flat(240, [72]), 240)
    const problem = checkShots(shots)
    expect(problem && shotProblemCopyOf(problem)).toEqual({
      titleKey: "remake.error.shotLength.title",
      bodyKey: "remake.error.shotLength.body",
      values: { number: 2, seconds: 7 },
    })
  })
})

describe("Remake counts each shot in frames from the reference's cuts", () => {
  const cuts = [0, 2.02, 4.04, 6.06, 8.08, 10.1, 12.012]
  const shots: FoundShot[] = cuts.slice(1).map((end, index) => ({
    number: index + 1,
    startSeconds: cuts[index] ?? 0,
    endSeconds: end,
  }))

  it("sums the shots to the edit's own length within 1 frame, with no drift at each cut", () => {
    expect(editSecondsOf(shots) * 24).toBe(framesOf(12.012))
    let start = 0
    for (const shot of shots) {
      expect(start).toBe(framesOf(shot.startSeconds))
      start += shotFramesOf(shot)
    }
  })
})
