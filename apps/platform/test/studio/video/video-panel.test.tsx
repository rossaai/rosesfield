import type { CatalogModel } from "@rosesfield/catalog/comfy"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"
import { SoundChip } from "@/studio/video/video-chips"
import { KindSwitch } from "@/studio/video/video-panel"

afterEach(cleanup)

function model(id: string, kind: CatalogModel["kind"]): CatalogModel {
  return {
    id,
    kind,
    maker: "Maker",
    name: id,
    nameKey: null,
    task: "text-to-video",
    tags: [],
    form: null,
  }
}

const hosted: HostedState = {
  isTaskApp: true,
  models: [model("ltx-2-5", "graph"), model("maker/clip-3", "hosted")],
  isLoading: false,
  error: null,
  keyState: "missing",
  defaultModel: "ltx-2-5",
  chosen: null,
  fields: null,
  ranBefore: [],
  choose: () => undefined,
}

const form: AppForm = {
  values: { inputs: {}, seedMode: "random", count: 1, aspectRatio: null },
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
}

describe("the video column's rhythm", () => {
  it("leaves 16 px under the mode switch: its own 8 px margin over the column's 8 px gap", () => {
    render(<KindSwitch hosted={hosted} kind="graph" />)
    const control = document.querySelector("[data-slot='segmented-control']")
    expect(control?.parentElement?.className.split(" ")).toContain("mb-2")
  })
})

describe("the prompt's chip row", () => {
  it("holds Sound as a 26 px chip", () => {
    render(
      <TooltipProvider>
        <SoundChip form={form} fields={null} isGraph makesSound={false} />
      </TooltipProvider>
    )
    const chip = screen.getByRole("button", { pressed: true })
    expect(chip.className.split(" ")).toContain("h-6.5")
  })
})
