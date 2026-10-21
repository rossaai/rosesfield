import { describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { badgesOf, weightsLinkOf } from "@/screens/app/hosted/catalog-picker"

const openWeights = [{ kind: "open-weights" as const }]

describe("the Open weights badge of a model row", () => {
  it("opens the model's weights page on Hugging Face", () => {
    expect(badgesOf("z-image-turbo", openWeights)).toEqual([
      {
        kind: "openWeights",
        label: t("model.tag.openWeights"),
        href: "https://huggingface.co/Tongyi-MAI/Z-Image-Turbo",
      },
    ])
  })

  it("opens the Hugging Face repository a model names when its link is its licence", () => {
    expect(weightsLinkOf("ltx-2-5")).toBe(
      "https://huggingface.co/Lightricks/LTX-2.5"
    )
  })

  it("links nowhere for a model with no weights page on Hugging Face", () => {
    expect(weightsLinkOf("real-esrgan")).toBeNull()
    expect(weightsLinkOf("minimax/minimax-h3")).toBeNull()
    expect(badgesOf("minimax/minimax-h3", openWeights)).toEqual([
      { kind: "openWeights", label: t("model.tag.openWeights") },
    ])
  })

  it("is absent on a model whose weights are closed", () => {
    expect(badgesOf("z-image-turbo", [{ kind: "sound" }])).toEqual([])
  })
})
