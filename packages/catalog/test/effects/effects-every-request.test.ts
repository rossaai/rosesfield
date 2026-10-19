import { describe, expect, it } from "vitest"
import {
  closingRule,
  type EffectValue,
  effectPrompts,
  effectValues,
  openingRule,
} from "#effects/comfy/effect-prompts"
import { effectRecipes, recipeOf } from "#effects/comfy/effect-recipes"
import {
  effectRatios,
  ltxFrames,
  resolutionValues,
} from "#effects/comfy/frame-sizes"
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

const baseModels = [
  "gemma4-12b-with-proj-ltx-2.5-comfy-int8-convrot.safetensors",
  "ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors",
  "ltx-2.5-audio-vae-bf16.safetensors",
  "ltx-2.5-latent-spatial-upscaler-x2-bf16-1.0.safetensors",
  "ltx-2.5-video-vae-bf16.safetensors",
]

const detail = "a red scarf"

type Case = {
  effect: EffectValue
  sound: "on" | "off"
  resolution: (typeof resolutionValues)[number]
  ratio: (typeof effectRatios)[number]
  length: 3 | 4 | 5
}

function cases(): Case[] {
  const all: Case[] = []
  for (const effect of effectValues) {
    const sounds =
      effectRecipes[effect].soundLine === null
        ? (["off"] as const)
        : (["on", "off"] as const)
    for (const sound of sounds) {
      for (const resolution of resolutionValues) {
        const index = all.length
        all.push({
          effect,
          sound,
          resolution,
          ratio: effectRatios[index % effectRatios.length] ?? "16:9",
          length: ([3, 4, 5] as const)[index % 3] ?? 5,
        })
      }
    }
  }
  return all
}

function expectedModels(effect: EffectValue): string[] {
  const recipe = recipeOf(effect)
  return [
    ...baseModels,
    ...(recipe.hold === null ? [] : ["birefnet.safetensors"]),
    ...(recipe.endFrame.source === "ic-lora"
      ? [recipe.endFrame.adapter.file]
      : []),
    ...(recipe.motion === null ? [] : [recipe.motion.file]),
  ].sort()
}

function expectedPrompt(effect: EffectValue, sound: "on" | "off"): string {
  const recipe = recipeOf(effect)
  const soundLine = effectRecipes[effect].soundLine
  return [
    recipe.motion?.trigger ?? "",
    openingRule,
    effectPrompts[effect],
    detail,
    sound === "on" && soundLine !== null ? soundLine : "",
    closingRule,
  ]
    .filter((part) => part !== "")
    .join(" ")
}

function inputs(one: Case): Record<string, unknown> {
  return {
    effect: one.effect,
    image: [photoId],
    prompt: detail,
    length: one.length,
    resolution: one.resolution,
    ...(effectRecipes[one.effect].soundLine === null
      ? {}
      : { sound: one.sound }),
  }
}

describe("every effects engine request against the recorded v2 routes", () => {
  const all = cases()

  it("covers each effect, each sound it offers and each resolution", () => {
    expect(all).toHaveLength(30)
  })

  it.each(
    all.map((one) => ({
      name: `${one.effect} sound ${one.sound} ${one.resolution} ${one.ratio} ${one.length}s`,
      one,
    }))
  )("$name", async ({ one }) => {
    const request = requestFor(inputs(one), one.ratio)
    const recipe = recipeOf(one.effect)
    const size = ltxFrames.sizes[one.resolution][one.ratio]
    const frames = ltxFrames.frames[String(one.length)]
    const { workflow, replay } = await submitted(request)
    expect(replay.sent.map((sent) => `${sent.method} ${sent.url}`)).toEqual([
      `POST ${cloudUrl}/api/v2/assets`,
      `POST ${cloudUrl}/api/v2/jobs`,
    ])
    expect(replay.sent[1]?.headers.get("Idempotency-Key")).toBe(idempotencyKey)
    expect(request.binding.config.models).toEqual(expectedModels(one.effect))
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
    expect(promptText(workflow, "364")).toBe(
      expectedPrompt(one.effect, one.sound)
    )
    expect(workflow["373"]?.inputs.text).toBe("")
    expect(workflow["358"] !== undefined).toBe(one.sound === "on")
    expect(Object.hasOwn(workflow["370"]?.inputs ?? {}, "audio")).toBe(
      one.sound === "on"
    )
    const end = recipe.endFrame
    if (end.source === "ic-lora") {
      expect(workflow).toMatchObject({
        "430": { inputs: { lora_name: end.adapter.file } },
        "433": { inputs: { width: size.width, height: size.height } },
        "439": { inputs: { noise_seed: 42 } },
        "460": { inputs: { strength: end.strength } },
        "463": { inputs: { strength: end.strength } },
      })
    } else {
      expect(workflow["430"]).toBeUndefined()
      expect(workflow["439"]).toBeUndefined()
    }
    if (end.source === "none") {
      expect(workflow["460"]).toBeUndefined()
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
    expect(workflow["420"]?.inputs.lora_name).toBe(recipe.motion?.file)
    expect(brokenLinks(workflow)).toEqual([])
  })
})
