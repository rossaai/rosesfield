import { describe, expect, it } from "vitest"
import {
  darkFrameNode,
  editFrameNodes,
  effectGraph,
  fittedPhotoNode,
  imageEditNodes,
  midFrameNodes,
  midGuideNodes,
} from "#effects/comfy/effect-graph"
import { effectBinding } from "#effects/comfy/effects-binding"
import { frameAt } from "#effects/comfy/frame-sizes"
import {
  type EffectRecipe,
  type MidFrame,
  resolutionValues,
} from "#effects/effect-recipe.contract"
import { effectRecipes, readRecipes, recipeOf } from "#effects/effect-recipes"
import { brokenLinks, fileGraph, workflowOf } from "./effects-replay"
import { keptRun } from "./passed-recipe"

const ledger = [keptRun("many-copies")]

function variant(change: Record<string, unknown>): Record<string, unknown> {
  return { ...recipeOf("many-copies"), ...change }
}

const eyeEdit: MidFrame = {
  source: "edit",
  prompt: "An extreme close-up of one of the person's eyes.",
  time: 5.5,
  strength: 0.8,
}

function withMidFrame(
  endFrame: EffectRecipe["endFrame"],
  midFrame: MidFrame = eyeEdit
): EffectRecipe {
  return { ...recipeOf("melt-away"), endFrame, midFrame }
}

const darkEnd = { source: "dark", luma: 1, strength: 0.9 } as const

describe("a designed frame inside the clip", () => {
  it("guides its frame on both video latents before the end-frame guides, from the edited frame resized and preprocessed as frame 0 is", () => {
    const workflow = workflowOf(effectGraph(fileGraph(), withMidFrame(darkEnd)))
    const [resize, preprocess] = midFrameNodes
    const [early, late] = midGuideNodes
    const guide = { frame_idx: 132, strength: 0.8 }
    expect(workflow).toMatchObject({
      [resize ?? ""]: {
        class_type: "ResizeImageMaskNode",
        inputs: { ...workflow["351"]?.inputs, input: ["627", 0] },
      },
      [preprocess ?? ""]: {
        class_type: "LTXVPreprocess",
        inputs: { ...workflow["350"]?.inputs, image: [resize, 0] },
      },
      [early ?? ""]: {
        class_type: "LTXVAddGuide",
        inputs: {
          positive: ["365", 0],
          negative: ["365", 1],
          vae: ["385", 0],
          latent: ["357", 0],
          image: [preprocess, 0],
          ...guide,
        },
      },
      "460": {
        inputs: {
          positive: [early, 0],
          negative: [early, 1],
          latent: [early, 2],
          image: [darkFrameNode, 0],
          frame_idx: -1,
        },
      },
      [late ?? ""]: {
        class_type: "LTXVAddGuide",
        inputs: {
          positive: ["462", 0],
          negative: ["462", 1],
          vae: ["385", 0],
          latent: ["349", 0],
          image: [preprocess, 0],
          ...guide,
        },
      },
      "463": {
        inputs: {
          positive: [late, 0],
          negative: [late, 1],
          latent: [late, 2],
          image: [darkFrameNode, 0],
          frame_idx: -1,
        },
      },
      "620": {
        inputs: { prompt: eyeEdit.prompt, image1: [fittedPhotoNode, 0] },
      },
      "351": { inputs: { input: [fittedPhotoNode, 0] } },
    })
    for (const id of [...editFrameNodes, ...imageEditNodes, darkFrameNode]) {
      expect({ id, kept: workflow[id] !== undefined }).toEqual({
        id,
        kept: true,
      })
    }
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("places the frame at its time at 24 frames a second, as the guide takes any frame of a one-image guide", () => {
    const placed = [0.5, 2.99, 5.5, 6.99].map((time) => {
      const workflow = workflowOf(
        effectGraph(fileGraph(), withMidFrame(darkEnd, { ...eyeEdit, time }))
      )
      return midGuideNodes.map((id) => workflow[id]?.inputs.frame_idx)
    })
    expect(placed).toEqual([
      [12, 12],
      [72, 72],
      [132, 132],
      [168, 168],
    ])
    expect([0.5, 2.99, 5.5, 6.99].map(frameAt)).toEqual([12, 72, 132, 168])
  })

  it("keeps the edit pass and the crop guides for a mid frame with no end frame, and drops the end-frame guides", () => {
    const workflow = workflowOf(
      effectGraph(fileGraph(), withMidFrame({ source: "none" }))
    )
    for (const id of ["460", "463", darkFrameNode]) {
      expect({ id, node: workflow[id] }).toEqual({ id, node: undefined })
    }
    const [early, late] = midGuideNodes
    expect(workflow).toMatchObject({
      "377": { inputs: { video_latent: [early, 2] } },
      "388": { inputs: { positive: [early, 0], negative: [early, 1] } },
      "462": { inputs: { positive: [early, 0], latent: ["367", 0] } },
      "391": { inputs: { positive: [late, 0], negative: [late, 1] } },
      "340": { inputs: { video_latent: [late, 2] } },
      "465": { inputs: { positive: [late, 0], latent: ["369", 0] } },
      "624": { inputs: { image: [fittedPhotoNode, 0] } },
      "626": { class_type: "KSampler" },
    })
    expect(brokenLinks(workflow)).toEqual([])
  })

  it("removes the mid-frame nodes and links the end-frame guides to what they read before, for a look with none", () => {
    for (const recipe of effectRecipes.filter((one) => one.midFrame === null)) {
      const workflow = workflowOf(effectGraph(fileGraph(), recipe))
      const mid = [...midFrameNodes, ...midGuideNodes].filter(
        (id) => workflow[id] !== undefined
      )
      expect({ effect: recipe.effect, mid }).toEqual({
        effect: recipe.effect,
        mid: [],
      })
      if (recipe.endFrame.source !== "none") {
        expect({ effect: recipe.effect, chain: workflow }).toMatchObject({
          effect: recipe.effect,
          chain: {
            "460": {
              inputs: {
                positive: ["365", 0],
                negative: ["365", 1],
                latent: ["357", 0],
              },
            },
            "463": {
              inputs: {
                positive: ["462", 0],
                negative: ["462", 1],
                latent: ["349", 0],
              },
            },
          },
        })
      }
      expect(brokenLinks(workflow)).toEqual([])
    }
  })

  it("leaves no broken link for a mid frame with each end frame it can sit beside, at every resolution", () => {
    for (const endFrame of [{ source: "none" } as const, darkEnd]) {
      for (const resolution of resolutionValues) {
        const binding = effectBinding(withMidFrame(endFrame), resolution)
        const workflow = workflowOf(binding.config.workflow)
        expect({ endFrame, resolution, broken: brokenLinks(workflow) }).toEqual(
          { endFrame, resolution, broken: [] }
        )
        expect(binding.config.models).toEqual(
          expect.arrayContaining(["qwen_image_edit_2511_bf16.safetensors"])
        )
      }
    }
  })

  it("reads one edited frame inside the clip beside a dark end frame or none, and refuses it beside an edited end frame or past the clip's end", () => {
    const midFrame = {
      source: "edit",
      prompt: "An extreme close-up of one of the person's eyes.",
      time: 5.5,
      strength: 0.8,
    }
    const dark = { source: "dark", luma: 1, strength: 0.9 }
    for (const endFrame of [dark, { source: "none" }]) {
      const [read] = readRecipes(
        { "many-copies": variant({ endFrame, midFrame }) },
        ledger
      )
      expect(read?.midFrame).toEqual(midFrame)
    }
    expect(recipeOf("many-copies").endFrame.source).toBe("edit")
    expect(() =>
      readRecipes({ "many-copies": variant({ midFrame }) }, ledger)
    ).toThrow(
      /many-copies\.json is invalid: midFrame The graph has one image edit pass, so a look edits its mid frame or its end frame, not both/
    )
    for (const time of [0, 7, 9.5]) {
      expect(() =>
        readRecipes(
          {
            "many-copies": variant({
              endFrame: dark,
              midFrame: { ...midFrame, time },
            }),
          },
          ledger
        )
      ).toThrow(/many-copies\.json is invalid: midFrame/)
    }
    expect(() =>
      readRecipes(
        {
          "many-copies": variant({
            endFrame: dark,
            midFrame: { ...midFrame, source: "dark" },
          }),
        },
        ledger
      )
    ).toThrow(/many-copies\.json is invalid: midFrame/)
  })
})
