import { describe, expect, it } from "vitest"
import { effectGraph } from "#effects/comfy/effect-graph"
import { audioFramesOf, framesOf, ltxFrames } from "#effects/comfy/frame-sizes"
import { effectRecipes as everyRecipe } from "#effects/effect-recipes"
import { fileGraph, workflowOf } from "./effects-replay"

const effectRecipes = everyRecipe.filter((recipe) => recipe.guide === null)

const audioVae = {
  sampleRate: 16000,
  melHop: 160,
  latentDownsample: 4,
}

function decodedSeconds(framesNumber: number): number {
  const latentsPerSecond =
    audioVae.sampleRate / audioVae.melHop / audioVae.latentDownsample
  const latents = Math.round((framesNumber / ltxFrames.fps) * latentsPerSecond)
  const melFrames =
    latents * audioVae.latentDownsample - (audioVae.latentDownsample - 1)
  return (melFrames * audioVae.melHop) / audioVae.sampleRate
}

function videoSeconds(seconds: number): number {
  return framesOf(seconds) / ltxFrames.fps
}

describe("the sound of an effect", () => {
  it("reads the audio decode the way the core LTX audio VAE does, at the 7.010 s the live runs measured for 169 frames", () => {
    expect(decodedSeconds(169)).toBeCloseTo(7.01, 3)
    expect(decodedSeconds(169)).toBeLessThan(videoSeconds(7))
  })

  it("decodes at least as long as the video for every length a look can take, and under one video frame longer", () => {
    for (let seconds = 5; seconds <= 15; seconds += 1) {
      const sound = decodedSeconds(audioFramesOf(seconds))
      const video = videoSeconds(seconds)
      expect({ seconds, covers: sound >= video }).toEqual({
        seconds,
        covers: true,
      })
      expect({ seconds, over: sound - video < 1 / ltxFrames.fps }).toEqual({
        seconds,
        over: true,
      })
    }
  })

  it("sizes the empty audio latent of every look from its length, so its sound runs to the last frame", () => {
    for (const recipe of effectRecipes) {
      const workflow = workflowOf(effectGraph(fileGraph(), recipe))
      expect({
        effect: recipe.effect,
        frames: workflow["366"]?.inputs.frames_number,
      }).toEqual({
        effect: recipe.effect,
        frames: audioFramesOf(recipe.seconds),
      })
    }
  })
})
