import { type EffectValue, effectValues } from "#effects/comfy/effect-prompts"

export type Adapter = {
  file: string
  repository: string
  revision: string
  strength: number
  trigger: string
}

export type EndFrame =
  | { source: "ic-lora"; adapter: Adapter; prompt: string; strength: number }
  | { source: "computed"; strength: number }
  | { source: "none" }

export type Recipe = {
  motion: Adapter | null
  endFrame: EndFrame
  hold: number | null
}

export type EffectRecipe = {
  soundLine: string | null
  mechanism: Recipe
  use: "mechanism" | "prompt-only"
}

export const adapters = {
  dayToNight: {
    file: "ltx-2.5-22b-ic-lora-day-to-night-0.9.safetensors",
    repository: "Lightricks/LTX-2.5-22b-IC-LoRA-Day-To-Night",
    revision: "52aac758c153f9a74a6f6fe08cf92d2167f3c184",
    strength: 1,
    trigger: "",
  },
  waterSimulation: {
    file: "ltx-2.5-22b-ic-lora-water-simulation-0.9.safetensors",
    repository: "Lightricks/LTX-2.5-22b-IC-LoRA-Water-Simulation",
    revision: "f698d6801a673c636a2c5165ffa07737d7964691",
    strength: 1,
    trigger: "ADD WATER.",
  },
  cinemagraph: {
    file: "ltx-2.5-22b-lora-cinemagraph-0.9.safetensors",
    repository: "Lightricks/LTX-2.5-22b-LoRA-Cinemagraph",
    revision: "8e5e88efcf59ff0efa6f9dcf7164c7a7d72c4022",
    strength: 1,
    trigger: "",
  },
  slowMotion: {
    file: "ltx-2.5-22b-lora-slow-motion-control-1.0.safetensors",
    repository: "Lightricks/LTX-2.5-22b-LoRA-Slow-Motion-Control",
    revision: "c7a014b985023874de6000fc791b959dbd46a0a8",
    strength: 1,
    trigger: "",
  },
} as const satisfies Readonly<Record<string, Adapter>>

export const promptOnly: Recipe = {
  motion: null,
  endFrame: { source: "none" },
  hold: null,
}

export const effectRecipes: Readonly<Record<EffectValue, EffectRecipe>> = {
  "confetti-burst": {
    soundLine:
      "The sound is two soft pops, then paper confetti rustling as it falls.",
    mechanism: { motion: null, endFrame: { source: "none" }, hold: 0.6 },
    use: "mechanism",
  },
  "day-to-night": {
    soundLine:
      "The sound is daytime noise fading into a quiet evening, with a few crickets.",
    mechanism: {
      motion: null,
      endFrame: {
        source: "ic-lora",
        adapter: adapters.dayToNight,
        prompt:
          "The same shot at night. The sky is dark blue, and lamps and windows glow with warm light.",
        strength: 0.8,
      },
      hold: null,
    },
    use: "mechanism",
  },
  "frost-over": {
    soundLine: "The sound is a light crackle of ice and a soft cold wind.",
    mechanism: { motion: null, endFrame: { source: "none" }, hold: 0.6 },
    use: "mechanism",
  },
  "ink-bloom": {
    soundLine:
      "The sound is a soft drip and the hush of ink spreading in water.",
    mechanism: {
      motion: null,
      endFrame: { source: "computed", strength: 0.8 },
      hold: null,
    },
    use: "mechanism",
  },
  "living-photo": {
    soundLine: null,
    mechanism: {
      motion: adapters.cinemagraph,
      endFrame: { source: "none" },
      hold: null,
    },
    use: "mechanism",
  },
  overgrown: {
    soundLine: "The sound is rustling leaves and a few birds.",
    mechanism: { motion: null, endFrame: { source: "none" }, hold: 0.5 },
    use: "mechanism",
  },
  rain: {
    soundLine: "The sound is steady rain, with drops tapping on the ground.",
    mechanism: {
      motion: null,
      endFrame: {
        source: "ic-lora",
        adapter: adapters.waterSimulation,
        prompt:
          "Heavy rain falls over the whole scene. Every surface is wet and reflects the light, and puddles cover the ground.",
        strength: 0.7,
      },
      hold: 0.5,
    },
    use: "mechanism",
  },
  weightless: {
    soundLine: "The sound is a low soft hum, with no footsteps or voices.",
    mechanism: {
      motion: adapters.slowMotion,
      endFrame: { source: "none" },
      hold: null,
    },
    use: "mechanism",
  },
}

export function recipeOf(effect: EffectValue): Recipe {
  const recipe = effectRecipes[effect]
  return recipe.use === "mechanism" ? recipe.mechanism : promptOnly
}

export const effectsWithSound: readonly EffectValue[] = effectValues.filter(
  (effect) => effectRecipes[effect].soundLine !== null
)
