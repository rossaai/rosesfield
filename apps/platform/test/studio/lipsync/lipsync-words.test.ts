import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { formOfModel, lipFieldsOf } from "@/studio/lipsync/lipsync-tabs"
import {
  lipsyncProblems,
  modesOf,
  planOf,
  runFieldsOf,
  speechAskOf,
  speechModelInput,
  speechTextInput,
  totalOf,
  wordsOfInputs,
} from "@/studio/lipsync/lipsync-words"
import {
  audioId,
  avatar,
  lipSync,
  ltx,
  photoApp,
  photoId,
  seedance,
  speech,
  valuesOf,
} from "./lipsync-models"

const avatarFields = lipFieldsOf(avatar.form ?? [])
const graphFields = lipFieldsOf(formOfModel(ltx, photoApp) ?? [])

describe("the Words switch", () => {
  it("offers Audio and Text on a model that takes audio", () => {
    expect(modesOf(avatarFields)).toEqual(["audio", "text"])
  })

  it("runs Text as a speech model then the lip sync model when the model takes no text, and hands the text straight to a model that speaks it", () => {
    expect(planOf("text", avatarFields)).toEqual({
      mode: "text",
      isChain: true,
      field: speechTextInput,
    })
    expect(planOf("text", lipFieldsOf(lipSync.form ?? []))).toEqual({
      mode: "text",
      isChain: false,
      field: "text",
    })
    expect(planOf("audio", avatarFields)).toEqual({
      mode: "audio",
      isChain: false,
      field: "soundFile",
    })
  })

  it("sends the speech model and your line in place of the audio on a Text run", () => {
    const plan = planOf("text", avatarFields)
    const names = runFieldsOf({
      fields: avatarFields,
      tab: "photo",
      plan,
      voices: [speech.id],
    }).map((field) => field.name)
    expect(names).toEqual([
      "image",
      "prompt",
      "mode",
      speechTextInput,
      speechModelInput,
    ])
  })

  it("keeps the audio and no speech inputs on an Audio run", () => {
    const names = runFieldsOf({
      fields: avatarFields,
      tab: "photo",
      plan: planOf("audio", avatarFields),
      voices: [speech.id],
    }).map((field) => field.name)
    expect(names).toEqual(["image", "soundFile", "prompt", "mode"])
  })

  it("restores Text for a run that held a line and no audio", () => {
    expect(wordsOfInputs({ [speechTextInput]: "Hello" }, avatarFields)).toBe(
      "text"
    )
    expect(
      wordsOfInputs(
        { [speechTextInput]: "Hello", soundFile: [audioId] },
        avatarFields
      )
    ).toBe("audio")
  })
})

describe("Generate with a photo and no words", () => {
  it("names the Words field first and says to add audio", () => {
    const plan = planOf("audio", graphFields)
    const fields = runFieldsOf({
      fields: graphFields,
      tab: "photo",
      plan,
      voices: [],
    })
    const found = lipsyncProblems({
      fields,
      face: "photo",
      plan,
      values: valuesOf({ photo: [photoId], audio: [], length: 5 }),
    })
    expect(found.map((problem) => problem.name)).toEqual(["audio"])
    const first = found[0]
    expect(first === undefined ? null : t(first.key, first.values)).toBe(
      t("field.asset.add.audio")
    )
  })

  it("says to write the words on Text", () => {
    const plan = planOf("text", graphFields)
    const fields = runFieldsOf({
      fields: graphFields,
      tab: "photo",
      plan,
      voices: [speech.id],
    })
    const found = lipsyncProblems({
      fields,
      face: "photo",
      plan,
      values: valuesOf({
        photo: [photoId],
        [speechModelInput]: speech.id,
        length: 5,
      }),
    })
    expect(found.map((problem) => [problem.name, problem.key])).toEqual([
      [speechTextInput, "field.prompt.required"],
    ])
  })

  it("names the missing photo before the words", () => {
    const plan = planOf("audio", graphFields)
    const found = lipsyncProblems({
      fields: runFieldsOf({
        fields: graphFields,
        tab: "photo",
        plan,
        voices: [],
      }),
      face: "photo",
      plan,
      values: valuesOf({ photo: [], audio: [], length: 5 }),
    })
    expect(found.map((problem) => problem.name)).toEqual(["photo", "audio"])
  })
})

describe("the face a lip sync needs", () => {
  it("is asked for even when the model's schema leaves it optional", () => {
    const fields = lipFieldsOf(seedance.form ?? [])
    const plan = planOf("audio", fields)
    const found = lipsyncProblems({
      fields: runFieldsOf({ fields, tab: "photo", plan, voices: [] }),
      face: "referenceImages",
      plan,
      values: valuesOf({ prompt: "A host", referenceAudios: [audioId] }),
    })
    expect(found.map((problem) => [problem.name, problem.key])).toEqual([
      ["referenceImages", "field.asset.required"],
    ])
  })
})

describe("the price of a Text run", () => {
  it("asks the speech model's price for your line", () => {
    expect(speechAskOf(speech, "Hello there")).toEqual({
      inputs: { model: speech.id, text: "Hello there" },
    })
    expect(speechAskOf(speech, "  ")).toBeNull()
    expect(speechAskOf(null, "Hello")).toBeNull()
  })

  it("adds the speech run to the lip sync run, and is unknown when either is", () => {
    expect(totalOf(59.1, 1.25)).toBe(60.35)
    expect(totalOf(59.1, null)).toBeNull()
    expect(totalOf(null, 1.25)).toBeNull()
  })
})
