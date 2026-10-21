import { type Run, run } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import { bodyOf, defaultsOf } from "@/screens/app/app-form"
import { scaleOf } from "@/studio/upscale/upscale-models"
import {
  scaleMessageOf,
  scaleNoteOf,
} from "@/studio/upscale/upscale-panel"
import {
  bodyAppFor,
  checkFor,
  messageOf,
  modeOf,
  runValuesOf,
  scaleFor,
} from "@/studio/upscale/use-upscale-screen"
import {
  catalog,
  flashVsr,
  graph,
  upscaleListing,
  waveSpeed,
} from "./upscale-fixtures"

function formWith(inputs: Record<string, string | string[]>) {
  const values = defaultsOf(upscaleListing())
  return { values: { ...values, inputs: { ...values.inputs, ...inputs } } }
}

function runOf(inputs: Run["inputs"]): Run {
  return run.parse({
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e09",
    appId: "upscale",
    status: "done",
    inputs,
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "demo",
    failure: null,
    createdAt: "2026-10-17T09:00:00.000Z",
    finishedAt: "2026-10-17T09:00:03.000Z",
  })
}

describe("the upscale checks", () => {
  it("names only the missing file of the chosen tab on the graph", () => {
    const app = upscaleListing()
    const names = (mode: "image" | "video") =>
      checkFor(app, graph)(formWith({ mode }).values).map((one) => one.name)
    expect(names("image")).toEqual(["image"])
    expect(names("video")).toEqual(["video"])
  })

  it("names the file input of a hosted model", () => {
    const check = checkFor(upscaleListing(), waveSpeed)
    expect(check(formWith({ mode: "image" }).values)).toEqual([
      expect.objectContaining({ name: "inputImage" }),
    ])
    expect(
      check(formWith({ mode: "image", inputImage: ["photo-1"] }).values)
    ).toEqual([])
  })

  it("sends only the file of the chosen tab on the graph", () => {
    const app = upscaleListing()
    const filled = formWith({ image: ["photo-1"], video: ["clip-1"] })
    const body = bodyOf(bodyAppFor(app, "image"), filled.values)
    expect(body.inputs).toMatchObject({ mode: "image", image: ["photo-1"] })
    expect(body.inputs).not.toHaveProperty("video")
  })

  it("reads an unknown mode as image", () => {
    expect(modeOf("video")).toBe("video")
    expect(modeOf("audio")).toBe("image")
    expect(modeOf(undefined)).toBe("image")
  })
})

describe("the scale line", () => {
  const app = upscaleListing()
  const square = { width: 1024, height: 1024 }

  it("reads Makes 2,048 by 2,048 pixels for an image of 1024 by 1024 at 2x", () => {
    const scale = scaleFor(scaleOf(graph, app), formWith({}), square)
    expect(scaleNoteOf({ app, scale })).toBe("Makes 2,048 by 2,048 pixels.")
    expect(scaleMessageOf({ app, scale })).toBeNull()
  })

  it("names the 3840 pixel limit when 4x passes it", () => {
    const scale = scaleFor(
      scaleOf(graph, app),
      formWith({ scale: "4x" }),
      square
    )
    expect(scale.check.state).toBe("tooBig")
    expect(scaleMessageOf({ app, scale })).toBe(
      "4x would make 4,096 by 4,096 pixels. The limit is 3,840 pixels on the long side. Pick a smaller scale or a smaller file."
    )
  })

  it("names the scale before a file is added, and says nothing of pixels for a target resolution", () => {
    const empty = scaleFor(scaleOf(graph, app), formWith({}), null)
    expect(scaleNoteOf({ app, scale: empty })).toBe(
      "The result is 2x as wide and as tall as your file."
    )
    const target = scaleFor(scaleOf(waveSpeed, app), formWith({}), square)
    expect(target.value).toBe("4k")
    expect(scaleNoteOf({ app, scale: target })).toBeNull()
    expect(scaleMessageOf({ app, scale: target })).toBeNull()
  })
})

describe("a run opened again", () => {
  it("opens a hosted video run on the Video tab", () => {
    const values = runValuesOf(
      upscaleListing(),
      runOf({ model: flashVsr.id, video: ["clip-1"], duration: 5 }),
      catalog
    )
    expect(values.inputs.mode).toBe("video")
  })

  it("keeps the tab of a graph run", () => {
    const values = runValuesOf(
      upscaleListing(),
      runOf({ model: graph.id, mode: "video", video: ["clip-1"] }),
      catalog
    )
    expect(values.inputs.mode).toBe("video")
  })
})

describe("the upscale file messages", () => {
  it("names a file the browser cannot open in the mode's words", () => {
    expect(messageOf("image", { kind: "unreadable" })).toContain(
      "cannot open this image"
    )
    expect(messageOf("video", { kind: "unreadable" })).toContain(
      "cannot open this video"
    )
  })

  it("names the kinds the mode takes", () => {
    expect(messageOf("video", { kind: "wrongKind" })).toBe(
      "This input takes MP4, MOV or WebM videos. Pick another file."
    )
  })

  it("names the short side and the minimum", () => {
    expect(messageOf("image", { kind: "tooSmall", side: 63, min: 64 })).toBe(
      "This image is 63 pixels on its short side. Pick one of 64 pixels or more."
    )
  })

  it("names a clip longer than the limit with a length over the limit", () => {
    expect(
      messageOf("video", { kind: "tooLong", seconds: 10.1, max: 10 })
    ).toBe("This clip runs 10.1 seconds. Pick one of 10 seconds or less.")
  })
})
