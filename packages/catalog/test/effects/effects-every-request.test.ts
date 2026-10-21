import { describe, expect, it } from "vitest"
import {
  deliveryFrames,
  effectRatios,
  framesOf,
  ltxFrames,
} from "#effects/comfy/frame-sizes"
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
  "ltx-2.5-22b-distilled-transformer-bf16.safetensors"

const ltxModels = [
  "gemma4-12b-with-proj-ltx-2.5-bf16.safetensors",
  "ltx-2.5-audio-vae-bf16.safetensors",
  "ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors",
  "ltx-2.5-video-vae-bf16.safetensors",
]

const imageEditModels = [
  "qwen_2.5_vl_7b_fp8_scaled.safetensors",
  "qwen_image_edit_2511_bf16.safetensors",
  "qwen_image_vae.safetensors",
]

const detail = "a red scarf"

const effects = [
  "buildings-ripple",
  "freeze-and-circle",
  "grow-giant",
  "many-copies",
  "melt-away",
  "pull-back-to-space",
  "push-into-eye",
  "scatter-petals",
  "still-in-the-street",
]

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
      ...(recipe.endFrame.source === "edit" || recipe.midFrame !== null
        ? imageEditModels
        : []),
      ...(recipe.hold === null ? [] : ["birefnet.safetensors"]),
    ].sort(),
  ]
}

function expectedPrompt(recipe: EffectRecipe): string {
  const parts = [recipe.prompt, detail, recipe.design.sound?.prompt ?? ""]
  return parts.filter((part) => part !== "").join(" ")
}

describe("every effects engine request against the recorded v2 routes", () => {
  const all = cases()

  it("covers each of the nine effects at each resolution", () => {
    expect(all.map((one) => `${one.recipe.effect} ${one.resolution}`)).toEqual(
      effects.flatMap((effect) => [`${effect} 480p`, `${effect} 720p`])
    )
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
    const delivery = deliveryFrames[one.resolution][one.ratio]
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
      "606": {
        inputs: {
          image: ["395", 0],
          width: size.width,
          height: size.height,
          crop: "center",
        },
      },
      "356": {
        inputs: {
          width: size.width / 2,
          height: size.height / 2,
          length: frames,
        },
      },
      "366": { inputs: { frames_number: frames + 1 } },
      "357": { inputs: { strength: 0.7 } },
      "349": { inputs: { strength: 1 } },
      "380": {
        inputs: { width: delivery.width, height: delivery.height },
      },
    })
    expect(promptText(workflow, "364").trim()).toBe(expectedPrompt(recipe))
    expect(workflow["373"]?.inputs.text).toBe("")
    expect(workflow["358"] !== undefined).toBe(recipe.design.sound !== null)
    expect(workflow["370"]?.inputs.audio !== undefined).toBe(
      recipe.design.sound !== null
    )
    expect(workflow["420"]).toBeUndefined()
    const end = recipe.endFrame
    const opening = recipe.photoFrame === "first" ? ["606", 0] : ["627", 0]
    const closing = recipe.photoFrame === "first" ? ["627", 0] : ["606", 0]
    expect(workflow).toMatchObject({
      "351": { inputs: { input: opening } },
      "357": { inputs: { image: ["350", 0] } },
      "349": { inputs: { image: ["350", 0] } },
    })
    if (end.source === "none") {
      expect(workflow["620"]).toBeUndefined()
      expect(workflow["460"]).toBeUndefined()
    } else if (end.source === "dark") {
      expect(workflow["620"] === undefined).toBe(recipe.midFrame === null)
      expect(workflow).toMatchObject({
        "628": { inputs: { color: end.luma * 0x010101 } },
        "460": { inputs: { image: ["628", 0], strength: end.strength } },
        "463": { inputs: { image: ["628", 0], strength: end.strength } },
      })
    } else {
      expect(workflow).toMatchObject({
        "620": { inputs: { prompt: end.prompt } },
        "626": { inputs: { seed: 42 } },
        "460": { inputs: { image: closing, strength: end.strength } },
        "463": { inputs: { image: closing, strength: end.strength } },
      })
    }
    const mid = recipe.midFrame
    if (mid === null) {
      expect(workflow["472"]).toBeUndefined()
      expect(workflow["473"]).toBeUndefined()
    } else {
      expect(workflow).toMatchObject({
        "620": { inputs: { prompt: mid.prompt } },
        "626": { inputs: { seed: 42 } },
        "471": { inputs: { image: ["470", 0] } },
        "472": { inputs: { image: ["471", 0], strength: mid.strength } },
        "473": { inputs: { image: ["471", 0], strength: mid.strength } },
        "460": { inputs: { positive: ["472", 0], latent: ["472", 2] } },
        "463": { inputs: { positive: ["473", 0], latent: ["473", 2] } },
      })
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
