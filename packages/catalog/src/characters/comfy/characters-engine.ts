import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { qwenEdit2511Angles } from "#characters/comfy/angles-workflows"
import {
  klein4bTraits,
  qwenImage2512Traits,
  zImageTurboTraits,
} from "#characters/comfy/traits-workflows"

export function charactersEngine(): EngineBinding {
  return selectBinding({
    input: "mode",
    options: {
      traits: selectBinding({
        input: "model",
        options: {
          "flux-2-klein-4b": klein4bTraits(),
          "z-image-turbo": zImageTurboTraits(),
          "qwen-image-2512": qwenImage2512Traits(),
        },
      }),
      angles: qwenEdit2511Angles(),
    },
  })
}
