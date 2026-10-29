import { describe, expect, it } from "vitest"
import { optionsOf } from "#infrastructure/router/router-choices"

const quality = [
  "auto",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "standard",
  "hd",
]

describe("the values an enum offers", () => {
  it("leaves out the quality values GPT Image's schema says no admitted model reads", () => {
    expect(
      optionsOf({
        type: "string",
        enum: quality,
        description:
          "The quality of the generated or edited image. `xhigh` and `max` are the two tiers gpt-image-2.5-flare and gpt-image-2.5-sunburst were added for; `standard` and `hd` are dall-e-era spellings no admitted model reads.",
      })
    ).toEqual(["auto", "low", "medium", "high", "xhigh", "max"])
  })

  it("control: keeps the enum values a description quotes when it never says no model reads them", () => {
    expect(
      optionsOf({
        type: "string",
        enum: quality,
        description:
          "The quality of the image. `standard` and `hd` are the two tiers the model was added for.",
      })
    ).toEqual(quality)
  })
})
