import { appId } from "@rosesfield/contract"
import { describe, expect, it } from "vitest"
import type { CatalogModel } from "#comfy/model-catalog.contract"
import {
  lipInputsOf,
  speakThenSync,
  speechPlanOf,
} from "#lipsync/lipsync-chain"
import {
  audio,
  FakeSpeechChain,
  graphTarget,
  lipsync,
  photoAsset,
  speechAsset,
  typed,
} from "./chain-fakes"

const hostedVoice: CatalogModel = {
  id: "hosted/voice",
  kind: "hosted",
  maker: "Maker",
  name: "Voice",
  nameKey: null,
  task: "speech",
  tags: [{ kind: "hosted" }],
  form: [
    {
      kind: "prompt",
      name: "prompt",
      path: "prompt",
      required: true,
      maxLength: 500,
      default: null,
    },
  ],
}

const voiceTrackCheck = {
  app: lipsync,
  form: {
    model: "ltx-2-3",
    fields: [
      {
        kind: "choice" as const,
        name: "mode",
        path: "mode",
        required: false,
        options: ["photo"],
        default: "photo",
      },
      {
        kind: "media" as const,
        name: "photo",
        path: "photo",
        required: true,
        media: "image" as const,
        min: 1,
        max: 1,
      },
      {
        kind: "media" as const,
        name: "voiceTrack",
        path: "voice_track",
        required: true,
        media: "audio" as const,
        min: 1,
        max: 1,
      },
      {
        kind: "number" as const,
        name: "length",
        path: "length",
        required: false,
        min: 1,
        max: 20,
        integer: false,
        default: null,
      },
    ],
  },
}

describe("Text in Lip sync, which makes the speech first and then the video", () => {
  it("speaks your line on Audio's speech default, then syncs the photo to the audio it made at its length", async () => {
    const chain = new FakeSpeechChain({})
    const outcome = await speakThenSync({
      app: audio,
      voices: [],
      target: graphTarget,
      request: typed,
      key: "line-1",
      chain,
    })
    expect(chain.started).toEqual([
      {
        appId: "audio",
        request: {
          inputs: {
            model: "speech-graph",
            script: "Hello there, this is my line",
          },
          aspectRatio: null,
        },
        key: "line-1-speech",
      },
      {
        appId: "lipsync",
        request: {
          inputs: {
            mode: "photo",
            model: "ltx-2-3",
            photo: [photoAsset],
            length: 5.04,
            audio: [speechAsset],
          },
          aspectRatio: "1:1",
        },
        key: "line-1-video",
      },
    ])
    expect(outcome).toMatchObject({
      kind: "started",
      speech: { appId: "audio", status: "done", outputs: [speechAsset] },
      video: { appId: "lipsync" },
    })
  })

  it("speaks your line on the voice you picked, in that voice's own text field", async () => {
    const chain = new FakeSpeechChain({})
    await speakThenSync({
      app: audio,
      voices: [hostedVoice],
      target: {
        appId: "lipsync",
        audio: "voiceTrack",
        length: null,
        check: voiceTrackCheck,
      },
      request: {
        inputs: { ...typed.inputs, speechModel: "hosted/voice" },
        aspectRatio: null,
      },
      key: "line-2",
      chain,
    })
    expect(chain.started[0]?.request.inputs).toEqual({
      model: "hosted/voice",
      prompt: "Hello there, this is my line",
    })
    expect(chain.started[1]?.request.inputs).toEqual({
      mode: "photo",
      model: "ltx-2-3",
      photo: [photoAsset],
      length: 10,
      voiceTrack: [speechAsset],
    })
  })

  it("keeps the length you set when the speech holds no length", async () => {
    const chain = new FakeSpeechChain({ seconds: null })
    await speakThenSync({
      app: audio,
      voices: [],
      target: graphTarget,
      request: typed,
      key: "line-3",
      chain,
    })
    expect(chain.started[1]?.request.inputs).toMatchObject({ length: 10 })
  })

  it("starts no video when the speech run fails or makes nothing", async () => {
    for (const fake of [
      new FakeSpeechChain({ speechStatus: "failed" }),
      new FakeSpeechChain({ speechOutputs: [] }),
    ]) {
      const outcome = await speakThenSync({
        app: audio,
        voices: [],
        target: graphTarget,
        request: typed,
        key: "line-4",
        chain: fake,
      })
      expect(outcome.kind).toBe("unspoken")
      expect(fake.started.map((one) => one.appId)).toEqual(["audio"])
    }
  })

  it("starts no run at all for an empty line", async () => {
    const chain = new FakeSpeechChain({})
    const outcome = await speakThenSync({
      app: audio,
      voices: [],
      target: graphTarget,
      request: {
        inputs: { ...typed.inputs, speechText: "   " },
        aspectRatio: null,
      },
      key: "line-5",
      chain,
    })
    expect(outcome).toEqual({ kind: "unplanned" })
    expect(chain.started).toEqual([])
  })
})

describe("the parts of the Text chain", () => {
  it("drops the line and the voice from the inputs the lip sync run takes", () => {
    expect(lipInputsOf(typed.inputs)).toEqual({
      mode: "photo",
      model: "ltx-2-3",
      photo: [photoAsset],
      length: 10,
    })
  })

  it("plans no speech for an app with no model choice and no voice picked", () => {
    const bare = { id: appId.parse("audio"), inputs: audio.inputs.slice(1) }
    expect(
      speechPlanOf({ app: bare, voices: [], inputs: typed.inputs })
    ).toBeNull()
  })
})
