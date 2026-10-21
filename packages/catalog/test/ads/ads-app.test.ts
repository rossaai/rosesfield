import { type AppDefinition, startRunBodyFor } from "@rosesfield/contract"
import { comfyWorkflowAdapter, resolveBinding } from "@rosesfield/generation"
import { describe, expect, it } from "vitest"
import {
  headlineLimit,
  type KindValue,
  keyOf,
  kindValues,
  lineLimit,
  type ModelValue,
  modelValues,
  photoInputs,
  referenceLimits,
  sceneLimit,
} from "#ads/ads-values"
import { app } from "#ads/app"
import { stylePhrases } from "#ads/comfy/ads-prompts"
import { adsCopy } from "#ads/copy.en"
import { readApps } from "#list-apps"
import { findWorkflow } from "#list-workflows"

function readAds(): AppDefinition {
  const [read] = readApps([{ folder: "ads", app }])
  if (read === undefined) {
    throw new Error("The catalog did not read Ads")
  }
  return read
}

const definition = readAds()
const body = startRunBodyFor(definition)
const photo = "4d2c1b0a-9e8f-4a6b-8c5d-3e2f1a0b9c8d"
const character = "7a5f4e3d-2c1b-4d9e-9f8a-6b5c4d3e2f1a"
const named = /\b(?:by|from|like|in the style of)\s+[A-Z]/

function optionValues(name: string): string[] {
  const input = definition.inputs.find((one) => one.name === name)
  return input?.type === "choice"
    ? input.options.map((option) => option.value)
    : []
}

function phraseProblems(
  values: readonly string[],
  phrases: Readonly<Record<string, string>>
): string[] {
  return values.flatMap((value) => {
    const phrase = phrases[value]
    if (phrase === undefined) {
      return [`${value} has no phrase`]
    }
    const words = phrase.split(/\s+/).length
    return [
      ...(words > 12 ? [`${value} has ${words} words`] : []),
      ...(named.test(phrase) ? [`${value} names a maker`] : []),
    ]
  })
}

function photosOf(count: number): Record<string, string[]> {
  return Object.fromEntries(
    photoInputs.slice(0, count).map((name) => [name, [photo]])
  )
}

function accepts(inputs: Record<string, unknown>, count?: number): boolean {
  return body.safeParse({ inputs, ...(count === undefined ? {} : { count }) })
    .success
}

type Case = {
  model: ModelValue
  kind: KindValue
  photos: number
  hasPerson: boolean
}

const cases: Case[] = modelValues.flatMap((model) =>
  kindValues.flatMap((kind) =>
    [1, 2, 3].flatMap((photos) =>
      [false, true].map((hasPerson) => ({ model, kind, photos, hasPerson }))
    )
  )
)

function inputsOf(one: Case): Record<string, unknown> {
  return {
    model: one.model,
    kind: one.kind,
    ...(one.kind === "ad" ? { headline: "Fresh cold brew" } : {}),
    ...photosOf(one.photos),
    ...(one.hasPerson ? { character: [character] } : {}),
  }
}

function fits(one: Case): boolean {
  return one.photos + (one.hasPerson ? 1 : 0) <= referenceLimits[one.model]
}

describe("the Ads definition", () => {
  it("is read by the catalog with its inputs in the order their conditions need", () => {
    expect(definition.inputs.map((input) => input.name)).toEqual([
      "kind",
      "scene",
      "headline",
      "line",
      "product",
      "secondPhoto",
      "thirdPhoto",
      "character",
      "style",
      "model",
      "seed",
    ])
    expect(optionValues("model")).toEqual([...modelValues])
  })

  it("refuses every value that is not an open-weights model it binds", () => {
    expect(accepts({ ...photosOf(1), model: "nano-banana-2" })).toBe(false)
    expect(accepts({ ...photosOf(1), model: "gpt-image-2" })).toBe(false)
  })

  it("binds the Qwen Image Edit 2511 graph as its default and its only graph, with no FLUX.2 Klein 4B and no Wan model", () => {
    const model = definition.inputs.find((input) => input.name === "model")
    expect(model?.type === "choice" ? model.default : null).toBe(
      "qwen-image-edit-2511"
    )
    expect(optionValues("model")).toEqual(["qwen-image-edit-2511"])
    expect(
      optionValues("model").filter((value) => /wan/i.test(value))
    ).toEqual([])
    expect(accepts({ ...photosOf(1), model: "flux-2-klein-4b" })).toBe(false)
    expect(findWorkflow("ads-qwen-image-edit-2511")).not.toBeNull()
    expect(findWorkflow("ads-flux-2-klein-4b")).toBeNull()
    const binding = resolveBinding(
      definition.engine,
      body.parse({ inputs: photosOf(1) }).inputs
    )
    expect(binding.config.models).toContain(
      "qwen_image_edit_2511_fp8mixed.safetensors"
    )
  })

  it("asks for a product photo and allows up to 4 images in a run", () => {
    expect(accepts({})).toBe(false)
    expect(accepts({ scene: "on a counter" })).toBe(false)
    expect(accepts(photosOf(1), 4)).toBe(true)
    expect(accepts(photosOf(1), 5)).toBe(false)
  })

  it("takes the third photo only after the second", () => {
    expect(accepts({ product: [photo], thirdPhoto: [photo] })).toBe(false)
    expect(accepts(photosOf(3))).toBe(true)
    expect(accepts({ ...photosOf(1), secondPhoto: [photo, photo] })).toBe(false)
  })

  it("takes a scene only in a product shot, and words only in an ad", () => {
    const shot = { ...photosOf(1), kind: "product-shot" }
    const ad = { ...photosOf(1), kind: "ad" }
    expect(accepts({ ...shot, scene: "a".repeat(sceneLimit) })).toBe(true)
    expect(accepts({ ...shot, scene: "a".repeat(sceneLimit + 1) })).toBe(false)
    expect(accepts({ ...shot, headline: "Fresh cold brew" })).toBe(false)
    expect(accepts(ad)).toBe(false)
    expect(accepts({ ...ad, headline: "   " })).toBe(false)
    expect(accepts({ ...ad, headline: "a".repeat(headlineLimit) })).toBe(true)
    expect(accepts({ ...ad, headline: "a".repeat(headlineLimit + 1) })).toBe(
      false
    )
    expect(
      accepts({ ...ad, headline: "Fresh", line: "a".repeat(lineLimit) })
    ).toBe(true)
    expect(
      accepts({ ...ad, headline: "Fresh", line: "a".repeat(lineLimit + 1) })
    ).toBe(false)
    expect(accepts({ ...ad, headline: "Fresh", scene: "a counter" })).toBe(
      false
    )
  })

  it.each(
    cases.map((one) => ({
      ...one,
      name: `${one.model} ${one.kind} ${one.photos} photos${one.hasPerson ? " and a character" : ""}`,
    }))
  )(
    "accepts $name only when the photos fit the model, and binds a workflow to each accepted run",
    (one) => {
      const parsed = body.safeParse({ inputs: inputsOf(one) })
      expect(parsed.success).toBe(fits(one))
      if (parsed.success) {
        const binding = resolveBinding(definition.engine, parsed.data.inputs)
        expect(binding.adapter).toBe(comfyWorkflowAdapter)
        expect(binding.config.outputsPerJob).toBe("one")
      }
    }
  )
})

describe("the Ads copy and style phrases", () => {
  it("hold one phrase of at most 12 words for each style the app lists", () => {
    expect(optionValues("style")).toHaveLength(6)
    expect(phraseProblems(optionValues("style"), stylePhrases)).toEqual([])
  })

  it("name a style with no phrase", () => {
    expect(
      phraseProblems([...optionValues("style"), "neon"], stylePhrases)
    ).toEqual(["neon has no phrase"])
  })

  it("give every input, choice and model a string", () => {
    const keys = definition.inputs.flatMap((input) =>
      input.type === "choice"
        ? [input.labelKey, ...input.options.map((option) => option.labelKey)]
        : [input.labelKey]
    )
    const lines = modelValues.map((model) => `ads.model.${keyOf(model)}.line`)
    const missing = [...keys, ...lines].filter(
      (one) => !Object.hasOwn(adsCopy, one)
    )
    expect(missing).toEqual([])
  })

  it("state the limits the definition holds in the notes", () => {
    expect(adsCopy["ads.input.scene.note"]).toContain(`${sceneLimit}`)
    expect(adsCopy["ads.input.headline.note"]).toContain(`${headlineLimit}`)
    expect(adsCopy["ads.input.headline.note"]).toContain(`${lineLimit}`)
    expect(adsCopy["ads.input.line.note"]).toContain(`${lineLimit}`)
  })
})
