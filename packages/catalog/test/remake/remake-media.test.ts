import type { ModelField, ModelForm } from "@rosesfield/generation/bindings"
import { describe, expect, it } from "vitest"
import { joinArgsOf, type JoinShot } from "#remake/ffmpeg/ffmpeg-join"
import { swapClipArgsOf } from "#remake/ffmpeg/ffmpeg-swap-clip"
import { shortestSwapSecondsOf, swapPaddingOf } from "#remake/shot-padding"
import type { FoundShot } from "#remake/shot-plan"

const shots: FoundShot[] = [
  { number: 1, startSeconds: 0, endSeconds: 2 },
  { number: 2, startSeconds: 2, endSeconds: 3.5 },
  { number: 3, startSeconds: 3.5, endSeconds: 6 },
]

function shotAt(index: number): FoundShot {
  const shot = shots[index]
  if (shot === undefined) {
    return expect.unreachable("the edit has no such shot")
  }
  return shot
}

function filterOf(args: readonly string[]): string {
  return args[args.indexOf("-filter_complex") + 1] ?? ""
}

function formOf(field: ModelField): ModelForm {
  return { model: "hosted/swap", fields: [field] }
}

const durationNumber: ModelField = {
  name: "duration",
  path: "duration",
  required: false,
  kind: "number",
  min: 5,
  max: 10,
  integer: true,
  default: 5,
}

const durationChoice: ModelField = {
  name: "duration",
  path: "duration",
  required: false,
  kind: "choice",
  options: ["10", "5"],
  default: "5",
}

describe("Remake pads a replaced shot to the shortest clip its swap model takes", () => {
  it("reads 0 seconds from the LTX 2.3 control graph, which keeps any clip's frame count, so the clip is not padded", () => {
    expect(shortestSwapSecondsOf(null)).toBe(0)
    const args = swapClipArgsOf({
      reference: "reference.mp4",
      shot: shotAt(1),
      shortestSeconds: shortestSwapSecondsOf(null),
      output: "clip.mp4",
    })
    expect(filterOf(args)).toBe(
      "[0:v]fps=24,trim=start_frame=48:end_frame=84,setpts=PTS-STARTPTS[shot];[shot]null[clip]"
    )
    expect(args).toContain("-an")
  })

  it("reads a hosted model's shortest length from its number or its choice field", () => {
    expect(shortestSwapSecondsOf(formOf(durationNumber))).toBe(5)
    expect(shortestSwapSecondsOf(formOf(durationChoice))).toBe(5)
  })

  it("plays a shot of 1.5 seconds forward, backward, forward and backward, and keeps the first 5 seconds", () => {
    expect(swapPaddingOf(36, 5)).toEqual({
      frames: 36,
      passes: 4,
      paddedFrames: 120,
    })
    const filter = filterOf(
      swapClipArgsOf({
        reference: "reference.mp4",
        shot: shotAt(1),
        shortestSeconds: 5,
        output: "clip.mp4",
      })
    )
    expect(filter.split(";")).toEqual([
      "[0:v]fps=24,trim=start_frame=48:end_frame=84,setpts=PTS-STARTPTS[shot]",
      "[shot]split=4[p0][p1][p2][p3]",
      "[p0]null[q0]",
      "[p1]reverse[q1]",
      "[p2]null[q2]",
      "[p3]reverse[q3]",
      "[q0][q1][q2][q3]concat=n=4:v=1:a=0,trim=end_frame=120,setpts=PTS-STARTPTS[clip]",
    ])
  })

  it("control: a shot already as long as the model's shortest clip is cut and not padded", () => {
    expect(swapPaddingOf(48, 2)).toEqual({
      frames: 48,
      passes: 1,
      paddedFrames: 48,
    })
  })
})

describe("Remake joins the shots into one video as long as the reference", () => {
  const joined: JoinShot[] = [
    { shot: shotAt(0), made: "shot-1.mp4" },
    { shot: shotAt(1), made: null },
    { shot: shotAt(2), made: "shot-3.mp4" },
  ]

  function argsOf(sound: "on" | "off", width = 640): string[] {
    return joinArgsOf({
      reference: "reference.mp4",
      shots: joined,
      width,
      height: 360,
      sound,
      output: "remake.mp4",
    })
  }

  it("trims each made shot to its shot's frames, keeps the reference's own frames for a kept shot and joins them in order", () => {
    const fit =
      "scale=640:360:force_original_aspect_ratio=increase,crop=640:360,setsar=1"
    const args = argsOf("off")
    expect(args.filter((_, index) => args[index - 1] === "-i")).toEqual([
      "reference.mp4",
      "shot-1.mp4",
      "shot-3.mp4",
    ])
    expect(filterOf(args).split(";")).toEqual([
      `[1:v]fps=24,tpad=stop_mode=clone:stop=48,trim=end_frame=48,setpts=PTS-STARTPTS,${fit}[v0]`,
      `[0:v]fps=24,trim=start_frame=48:end_frame=84,setpts=PTS-STARTPTS,${fit}[v1]`,
      `[2:v]fps=24,tpad=stop_mode=clone:stop=60,trim=end_frame=60,setpts=PTS-STARTPTS,${fit}[v2]`,
      "[v0][v1][v2]concat=n=3:v=1:a=0[v]",
    ])
    expect(args).toContain("-an")
    expect(args.slice(-1)).toEqual(["remake.mp4"])
  })

  it("lays the reference's sound under the whole video when sound is on", () => {
    const args = argsOf("on")
    expect(filterOf(args).split(";").at(-1)).toBe(
      "[0:a]atrim=start=0:end=6,asetpts=PTS-STARTPTS[a]"
    )
    expect(args).toEqual(
      expect.arrayContaining(["-map", "[a]", "-c:a", "aac"])
    )
    expect(args).not.toContain("-an")
  })

  it("control: the same join with sound off reads no sound from the reference", () => {
    expect(filterOf(argsOf("off"))).not.toContain("[0:a]")
  })

  it("makes each side of the run's size even, as the video's pixel format needs", () => {
    expect(filterOf(argsOf("off", 641))).toContain("crop=642:360")
  })
})
