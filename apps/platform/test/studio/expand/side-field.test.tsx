import { type AppListing, appListing } from "@rosesfield/contract"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { SideField } from "@/studio/expand/expand-panel"

const top = {
  type: "number",
  name: "top",
  labelKey: "expand.input.top.label",
  min: 0,
  max: 100,
  step: 5,
  default: 0,
} as const

function expandListing(): AppListing {
  return appListing.parse({
    id: "expand",
    nameKey: "expand.name",
    category: "image",
    inputs: [top],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["16:9"], default: "16:9" },
    },
    limits: { timeoutSeconds: 600, maxRetries: 2 },
    preview: null,
  })
}

afterEach(cleanup)

describe("a side of Expand", () => {
  it("moves focus to its slider when its registered focus runs", () => {
    const app = expandListing()
    const input = app.inputs[0]
    if (input === undefined) {
      throw new Error("The side did not parse")
    }
    let focus: () => void = () => undefined
    const view = render(
      <SideField
        app={app}
        input={input}
        value={0}
        problem={undefined}
        onChange={() => undefined}
        register={(next) => {
          focus = next
        }}
      />
    )
    const slider = view.container.querySelector('input[type="range"]')
    expect(slider).not.toBeNull()
    expect(document.activeElement).not.toBe(slider)
    focus()
    expect(document.activeElement).toBe(slider)
  })
})
