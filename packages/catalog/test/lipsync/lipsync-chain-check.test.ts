import { describe, expect, it } from "vitest"
import { speakThenSync } from "#lipsync/lipsync-chain"
import type { ChainRun } from "#lipsync/speech-chain.port"
import {
  audio,
  FakeSpeechChain,
  graphTarget,
  lipsync,
  photoAsset,
  typed,
} from "./chain-fakes"

describe("a video run the gateway would refuse", () => {
  const avatarCheck = {
    app: lipsync,
    form: {
      model: "kling/videos-avatar-image2video",
      fields: [
        {
          kind: "media" as const,
          name: "image",
          path: "image",
          required: true,
          media: "image" as const,
          min: 1,
          max: 1,
        },
        {
          kind: "media" as const,
          name: "soundFile",
          path: "sound_file",
          required: false,
          media: "audio" as const,
          min: 1,
          max: 1,
        },
        {
          kind: "choice" as const,
          name: "mode",
          path: "mode",
          required: false,
          options: ["std", "pro"],
          default: "std",
        },
      ],
    },
  }

  const avatarTarget = {
    appId: "lipsync",
    audio: "soundFile",
    length: null,
    check: avatarCheck,
  }

  function askWith(mode: string): ChainRun {
    return {
      inputs: {
        model: "kling/videos-avatar-image2video",
        image: [photoAsset],
        mode,
        speechText: "Hello there",
        speechModel: "",
      },
      aspectRatio: null,
    }
  }

  it("starts no speech run when the video's inputs break its form", async () => {
    const chain = new FakeSpeechChain({})
    const outcome = await speakThenSync({
      app: audio,
      voices: [],
      target: avatarTarget,
      request: askWith("photo"),
      key: "line-6",
      chain,
    })
    expect(outcome).toMatchObject({
      kind: "invalid",
      issues: ["mode: the value is not one of the model's choices"],
    })
    expect(chain.started).toEqual([])
  })

  it("starts no speech run when a graph's own rules refuse the video", async () => {
    const chain = new FakeSpeechChain({})
    const { photo: _, ...withoutPhoto } = typed.inputs
    const outcome = await speakThenSync({
      app: audio,
      voices: [],
      target: graphTarget,
      request: { ...typed, inputs: withoutPhoto },
      key: "line-7",
      chain,
    })
    expect(outcome.kind).toBe("invalid")
    expect(chain.started).toEqual([])
  })

  it("control: speaks, then starts the video, when its inputs pass", async () => {
    const chain = new FakeSpeechChain({})
    const outcome = await speakThenSync({
      app: audio,
      voices: [],
      target: avatarTarget,
      request: askWith("pro"),
      key: "line-8",
      chain,
    })
    expect(outcome.kind).toBe("started")
    expect(chain.started.map((one) => one.appId)).toEqual(["audio", "lipsync"])
  })
})
