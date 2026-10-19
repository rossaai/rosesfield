import { describe, expect, it } from "vitest"
import { effectRatios, framesOf, ltxFrames } from "#effects/comfy/frame-sizes"
import {
  type EffectRecipe,
  resolutionValues,
} from "#effects/effect-recipe.contract"
import { effectRecipes } from "#effects/effect-recipes"
import {
  brokenLinks,
  cloudUrl,
  idempotencyKey,
  loadedPhoto,
  photoId,
  promptText,
  requestFor,
  submitted,
} from "./effects-replay"

const videoModel =
  "ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors"

const ltxModels = [
  "gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors",
  "ltx-2.5-audio-vae-bf16.safetensors",
  "ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors",
  "ltx-2.5-video-vae-bf16.safetensors",
]

const endFrameModels = [
  "flux-2-klein-4b.safetensors",
  "flux2-vae.safetensors",
  "qwen_3_4b.safetensors",
]

const detail = "a red scarf"

type Case = {
  recipe: EffectRecipe
  resolution: (typeof resolutionValues)[number]
  ratio: (typeof effectRatios)[number]
}

function cases(): Case[] {
  return effectRecipes.flatMap((recipe) =>
    resolutionValues.map((resolution, index) => ({
      recipe,
      resolution,
      ratio:
        effectRatios[
          (effectRecipes.indexOf(recipe) * 2 + index) % effectRatios.length
        ] ?? "16:9",
    }))
  )
}

function expectedModels(recipe: EffectRecipe): string[] {
  return [
    videoModel,
    ...[
      ...ltxModels,
      ...(recipe.hold === null ? [] : ["birefnet.safetensors"]),
      ...(recipe.endFrame.source === "none" ? [] : endFrameModels),
    ].sort(),
  ]
}

function expectedPrompt(recipe: EffectRecipe): string {
  return [recipe.prompt, detail].filter((part) => part !== "").join(" ")
}

describe("every effects engine request against the recorded v2 routes", () => {
  const all = cases()

  it("covers each effect at each resolution", () => {
    expect(all).toHaveLength(effectRecipes.length * 2)
    expect(effectRecipes.length).toBeGreaterThanOrEqual(13)
  })

  it.each(
    all.map((one) => ({
      name: `${one.recipe.effect} ${one.resolution} ${one.ratio}`,
      one,
    }))
  )("$name", async ({ one }) => {
    const { recipe } = one
    const request = requestFor(
      {
        effect: recipe.effect,
        image: [photoId],
        prompt: detail,
        resolution: one.resolution,
      },
      one.ratio
    )
    const size = ltxFrames.sizes[one.resolution][one.ratio]
    const frames = framesOf(recipe.seconds)
    const { workflow, replay } = await submitted(request)
    expect(replay.sent.map((sent) => `${sent.method} ${sent.url}`)).toEqual([
      `POST ${cloudUrl}/api/v2/assets`,
      `POST ${cloudUrl}/api/v2/jobs`,
    ])
    expect(replay.sent[1]?.headers.get("Idempotency-Key")).toBe(idempotencyKey)
    expect(request.binding.config.models).toEqual(expectedModels(recipe))
    expect(workflow).toMatchObject({
      "395": { inputs: { image: loadedPhoto } },
      "339": { inputs: { noise_seed: 42 } },
      "356": {
        inputs: {
          width: size.width / 2,
          height: size.height / 2,
          length: frames,
        },
      },
      "366": { inputs: { frames_number: frames } },
      "357": { inputs: { strength: 1 } },
      "349": { inputs: { strength: 1 } },
    })
    expect(promptText(workflow, "364").trim()).toBe(expectedPrompt(recipe))
    expect(workflow["373"]?.inputs.text).toBe("")
    expect(workflow["358"]).toBeUndefined()
    expect(workflow["370"]?.inputs).not.toHaveProperty("audio")
    expect(workflow["420"]).toBeUndefined()
    const end = recipe.endFrame
    if (end.source === "none") {
      expect(workflow["520"]).toBeUndefined()
      expect(workflow["460"]).toBeUndefined()
    } else {
      expect(workflow).toMatchObject({
        "523": { inputs: { text: end.prompt } },
        "532": { inputs: { noise_seed: 42 } },
        "460": { inputs: { image: ["536", 0], strength: end.strength } },
        "463": { inputs: { image: ["536", 0], strength: end.strength } },
      })
      expect(workflow["527"] !== undefined).toBe(end.source === "edit")
    }
    if (recipe.hold === null) {
      expect(workflow["461"]).toBeUndefined()
      expect(workflow["411"]).toBeUndefined()
    } else {
      expect(workflow).toMatchObject({
        "461": {
          inputs: { attention_mask: ["412", 0], strength: recipe.hold },
        },
        "464": {
          inputs: { attention_mask: ["412", 0], strength: recipe.hold },
        },
      })
    }
    expect(brokenLinks(workflow)).toEqual([])
  })
})
