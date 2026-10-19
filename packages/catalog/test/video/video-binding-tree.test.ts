import { resolveBinding } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import { app } from "#video/app"
import {
  ltxStartFrameBinding,
  ltxTextBinding,
  wanCameraBinding,
  wanClipBinding,
  wanStartFrameBinding,
  wanTextBinding,
} from "#video/comfy/video-engine"
import { checked, clipId, prompt, startFrameId } from "./video-recordings"

describe("the Video binding tree, read through the contract", () => {
  it.each([
    { name: "a prompt", inputs: {}, expected: ltxTextBinding("720p", "off") },
    {
      name: "a start frame",
      inputs: { startFrame: [startFrameId] },
      expected: ltxStartFrameBinding("720p", "off"),
    },
    {
      name: "LTX 2.5 at 480p with sound",
      inputs: { model: "ltx-2-5", resolution: "480p", sound: "on" },
      expected: ltxTextBinding("480p", "on"),
    },
    {
      name: "LTX 2.5 with a start frame at 480p with sound",
      inputs: {
        model: "ltx-2-5",
        startFrame: [startFrameId],
        resolution: "480p",
        sound: "on",
      },
      expected: ltxStartFrameBinding("480p", "on"),
    },
    {
      name: "Wan 2.2 from text",
      inputs: { model: "wan-2-2", cameraMove: "track-left" },
      expected: wanTextBinding(),
    },
    {
      name: "Wan 2.2 from a start frame with no move",
      inputs: { model: "wan-2-2", startFrame: [startFrameId] },
      expected: wanStartFrameBinding(),
    },
    {
      name: "Wan 2.2 from a start frame with a move",
      inputs: {
        model: "wan-2-2",
        startFrame: [startFrameId],
        cameraMove: "crane-down",
      },
      expected: wanCameraBinding(),
    },
    {
      name: "a clip with no model named",
      inputs: { clip: [clipId] },
      expected: wanClipBinding(),
    },
    {
      name: "a clip on Wan 2.2",
      inputs: { clip: [clipId], model: "wan-2-2", length: 4 },
      expected: wanClipBinding(),
    },
  ])("resolves $name to its workflow", ({ inputs, expected }) => {
    const result = checked({ prompt, ...inputs })
    expect(result.success).toBe(true)
    const binding = resolveBinding(app.engine, result.data?.inputs ?? {})
    expect(binding).toEqual(expected)
    expect(binding.config.outputsPerJob).toBe("one")
  })

  it("fills the Wan 2.2 values a caller leaves out", () => {
    const result = checked({ prompt, clip: [clipId] })
    expect(result.data?.inputs).toMatchObject({
      model: "wan-2-2",
      resolution: "480p",
      length: 5,
    })
    expect(result.data?.inputs).not.toHaveProperty("sound")
    expect(result.data?.inputs).not.toHaveProperty("cameraMove")
  })

  it.each([
    {
      name: "a clip and a start frame",
      inputs: { clip: [clipId], startFrame: [startFrameId] },
      path: "clip",
    },
    {
      name: "a clip on LTX 2.5",
      inputs: { clip: [clipId], model: "ltx-2-5" },
      path: "model",
    },
    {
      name: "a clip on Auto",
      inputs: { clip: [clipId], model: "auto" },
      path: "model",
    },
    {
      name: "a clip with a camera move",
      inputs: { clip: [clipId], cameraMove: "push-in" },
      path: "cameraMove",
    },
    {
      name: "Wan 2.2 at 720p",
      inputs: { model: "wan-2-2", resolution: "720p" },
      path: "resolution",
    },
    {
      name: "Wan 2.2 with sound",
      inputs: { model: "wan-2-2", sound: "off" },
      path: "sound",
    },
    {
      name: "two start frames",
      inputs: { startFrame: [startFrameId, clipId] },
      path: "startFrame",
    },
    { name: "a length of 6", inputs: { length: 6 }, path: "length" },
  ])("refuses $name before a binding is read", ({ inputs, path }) => {
    const result = checked({ prompt, ...inputs })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      `inputs.${path}`,
    ])
  })

  it("takes a count of 4 and refuses 5", () => {
    expect(checked({ prompt }, 4).success).toBe(true)
    expect(checked({ prompt }, 5).success).toBe(false)
  })
})
