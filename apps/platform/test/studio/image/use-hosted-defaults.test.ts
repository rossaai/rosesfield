import type { ModelField } from "@rosesfield/catalog/comfy"
import { describe, expect, it } from "vitest"
import { missingDefaults } from "@/studio/image/use-hosted-defaults"

const fluxThree: readonly ModelField[] = [
  {
    name: "prompt",
    path: "prompt",
    required: true,
    kind: "prompt",
    maxLength: null,
    default: null,
  },
  {
    name: "images",
    path: "images",
    required: false,
    kind: "media",
    media: "image",
    min: 1,
    max: 10,
  },
  {
    name: "safetyTolerance",
    path: "safety_tolerance",
    required: false,
    kind: "number",
    min: 0,
    max: 4,
    integer: true,
    default: 2,
  },
  {
    name: "grounding",
    path: "grounding",
    required: false,
    kind: "toggle",
    default: true,
  },
  {
    name: "aspectRatio",
    path: "aspect_ratio",
    required: false,
    kind: "text",
    maxLength: null,
    default: "auto",
  },
  {
    name: "resolution",
    path: "resolution",
    required: false,
    kind: "text",
    maxLength: null,
    default: "1k",
  },
]

describe("the defaults Image fills when it opens on a hosted model", () => {
  it("fills only the fields the form does not hold yet", () => {
    const missing = missingDefaults(fluxThree, {
      prompt: "a red kite",
      model: "bfl/flux-3-image",
      resolution: "2k",
    })
    expect(missing).toEqual({
      safetyTolerance: 2,
      grounding: "on",
      aspectRatio: "auto",
    })
  })
})
