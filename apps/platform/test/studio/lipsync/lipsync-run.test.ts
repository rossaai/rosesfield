import { describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { StartRun } from "@/screens/app/use-start-run"
import {
  carry,
  fieldsOfModel,
  guardedStart,
  pricedStart,
  runPartsOf,
  withAppModel,
} from "@/studio/lipsync/lipsync-run"
import {
  planOf,
  speechModelInput,
  speechTextInput,
} from "@/studio/lipsync/lipsync-words"
import {
  audioId,
  avatar,
  catalog,
  ltx,
  photoApp,
  photoId,
  seedance,
  speech,
  valuesOf,
} from "./lipsync-models"

function hostedOf(chosen: HostedState["chosen"]): HostedState {
  return {
    isTaskApp: true,
    models: catalog,
    isLoading: false,
    error: null,
    keyState: "set",
    defaultModel: ltx.id,
    chosen,
    fields: chosen?.form ?? null,
    ranBefore: [],
    choose: () => undefined,
  }
}

const started: StartRun = {
  generate: () => undefined,
  isPending: false,
  error: null,
  price: "",
  priceValue: "59.1",
  priceName: "Generate, 59.1 Comfy credits",
}

describe("the run a Text choice starts", () => {
  it("sends a hosted lip sync model your photo, your line and the voice, and no audio", () => {
    const fields = fieldsOfModel(avatar, photoApp)
    const parts = runPartsOf({
      app: photoApp,
      all: hostedOf(avatar),
      fields,
      tab: "photo",
      plan: planOf("text", fields),
      voices: [speech.id],
      values: valuesOf({
        image: [photoId],
        soundFile: [audioId],
        [speechTextInput]: "Hello there",
        [speechModelInput]: speech.id,
      }),
    })
    expect(parts.ask?.inputs).toEqual({
      model: avatar.id,
      image: [photoId],
      [speechTextInput]: "Hello there",
      [speechModelInput]: speech.id,
    })
    expect(parts.runHosted.chosen?.form?.map((field) => field.name)).toEqual(
      parts.runFields?.map((field) => field.name)
    )
  })

  it("adds your line and the voice to a graph's body and drops its audio", () => {
    const fields = fieldsOfModel(ltx, photoApp)
    const parts = runPartsOf({
      app: photoApp,
      all: hostedOf(ltx),
      fields,
      tab: "photo",
      plan: planOf("text", fields),
      voices: [speech.id],
      values: valuesOf({
        model: ltx.id,
        photo: [photoId],
        audio: [audioId],
        length: 5,
        [speechTextInput]: "Hello there",
        [speechModelInput]: speech.id,
      }),
    })
    expect(parts.bodyApp.inputs.map((input) => input.name)).toEqual([
      "model",
      "photo",
      "length",
      "seed",
      speechTextInput,
      speechModelInput,
    ])
    expect(parts.ask?.inputs).toEqual({
      model: ltx.id,
      photo: [photoId],
      length: 5,
      [speechTextInput]: "Hello there",
      [speechModelInput]: speech.id,
    })
    expect(parts.runHosted.chosen?.form).toBeNull()
  })

  it("keeps the audio on an Audio run", () => {
    const fields = fieldsOfModel(ltx, photoApp)
    const parts = runPartsOf({
      app: photoApp,
      all: hostedOf(ltx),
      fields,
      tab: "photo",
      plan: planOf("audio", fields),
      voices: [speech.id],
      values: valuesOf({ model: ltx.id, photo: [photoId], audio: [audioId] }),
    })
    expect(parts.ask?.inputs).toEqual({
      model: ltx.id,
      photo: [photoId],
      audio: [audioId],
    })
  })
})

describe("the price on Generate", () => {
  it("adds the speech run to the lip sync run on Text", () => {
    const priced = pricedStart(started, 59.1, 1.25, true)
    expect(priced.priceValue).toBe("60.35")
    expect(priced.priceName).toBe(t("run.generate.priced", { amount: "60.35" }))
  })

  it("says Price unknown when the speech run has no price", () => {
    const priced = pricedStart(started, 59.1, null, true)
    expect(priced.priceValue).toBeNull()
    expect(priced.price).toBe(t("run.price.unknown"))
  })

  it("keeps the lip sync price alone on Audio", () => {
    expect(pricedStart(started, 59.1, 1.25, false)).toBe(started)
  })
})

describe("Generate before the words", () => {
  it("starts no run and moves focus to the field that waits", () => {
    const generate = vi.fn()
    const focus = vi.fn()
    const form = {
      values: valuesOf({}),
      problems: new Map(),
      setInput: () => undefined,
      setForm: () => undefined,
      fill: () => undefined,
      validate: () => false,
      register: () => undefined,
    }
    guardedStart({
      started: { ...started, generate },
      form,
      wells: ["photo", "audio"],
      isWaiting: () => false,
      focus,
    }).generate()
    expect(generate).not.toHaveBeenCalled()
    guardedStart({
      started: { ...started, generate },
      form: { ...form, validate: () => true },
      wells: ["photo", "audio"],
      isWaiting: (name) => name === "audio",
      focus,
    }).generate()
    expect(generate).not.toHaveBeenCalled()
    expect(focus).toHaveBeenCalledWith("audio")
  })
})

describe("a change of model", () => {
  it("moves your photo, your audio and your line into the new model's own inputs", () => {
    const setInput = vi.fn()
    carry({
      from: fieldsOfModel(ltx, photoApp),
      to: fieldsOfModel(avatar, photoApp),
      kept: {
        photo: [photoId],
        audio: [audioId],
        [speechTextInput]: "Hello",
        length: 5,
      },
      setInput,
    })
    expect(setInput.mock.calls).toEqual([
      ["image", [photoId]],
      ["soundFile", [audioId]],
      [speechTextInput, "Hello"],
    ])
  })

  it("moves nothing a model has no input for", () => {
    const setInput = vi.fn()
    carry({
      from: fieldsOfModel(avatar, photoApp),
      to: fieldsOfModel(seedance, photoApp),
      kept: { image: [] },
      setInput,
    })
    expect(setInput).not.toHaveBeenCalled()
  })
})

describe("an app that lists no models", () => {
  it("runs as its own graph", () => {
    const own = withAppModel(photoApp, { ...hostedOf(null), isTaskApp: false })
    expect(own.chosen?.kind).toBe("graph")
    expect(own.chosen?.form).toBeNull()
    const kept = hostedOf(avatar)
    expect(withAppModel(photoApp, kept)).toBe(kept)
  })
})
