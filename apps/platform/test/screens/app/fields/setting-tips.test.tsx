import type { ModelField } from "@rosesfield/catalog/comfy"
import { fieldInset } from "@rosesfield/ui/components/input"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { afterEach, describe, expect, it } from "vitest"
import {
  settingNames,
  settingTipKeyOf,
  settingTipOf,
} from "@/catalog/setting-registry"
import { hasCatalogText, t } from "@/copy/t"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { ModelFieldChips } from "@/screens/app/hosted/field-chip"
import { fieldCaption, fieldTipOf } from "@/screens/app/hosted/field-words"
import { HostedSettings } from "@/screens/app/hosted/hosted-fields"
import type { NormalSetting } from "@/screens/app/setting-table"
import type { AppForm } from "@/screens/app/use-app-form"

afterEach(cleanup)

const form: AppForm = {
  values: { inputs: {}, seedMode: "random", count: 1, aspectRatio: null },
  problems: new Map(),
  setInput: () => undefined,
  setForm: () => undefined,
  fill: () => undefined,
  validate: () => true,
  register: () => undefined,
}

const topology: ModelField = {
  kind: "choice",
  name: "topology",
  path: "topology",
  required: false,
  options: ["quad", "triangle"],
  default: "triangle",
  description: "Mesh topology of the output.",
}

const frobLevel: ModelField = {
  kind: "number",
  name: "frobLevel",
  path: "frob_level",
  required: true,
  min: 0,
  max: 10,
  integer: true,
  default: null,
  description: "How much frob the model adds.",
}

const { description: _, ...bareFrob } = frobLevel

function Wrap({ children }: { children: ReactNode }): ReactElement {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )
}

function markOf(caption: string): HTMLElement | null {
  return screen.queryByRole("button", {
    name: t("field.tip.label", { setting: caption }),
  })
}

const leftOut = ["artStyle"]

const normals: readonly NormalSetting[] = [
  "format",
  "resolution",
  "quality",
  "length",
  "count",
  "voice",
  "language",
  "scale",
]

describe("a setting's tip", () => {
  it("has words for every setting the registry names, and for every normalized setting but content", () => {
    const missing = settingNames().filter(
      (name) => !hasCatalogText(settingTipKeyOf(name))
    )
    expect(missing).toEqual(leftOut)
    for (const name of normals) {
      expect(settingTipOf(name), name).not.toBeNull()
    }
  })

  it("shows its words when you hover the mark beside the label, and when the mark takes focus", async () => {
    render(
      <Wrap>
        <FieldFrame
          caption="Topology"
          hint={settingTipOf("topology")}
          isOptional={false}
          note={null}
          problem={undefined}
        >
          <input aria-label="Topology" />
        </FieldFrame>
      </Wrap>
    )
    const words = settingTipOf("topology") ?? ""
    const mark = markOf("Topology")
    if (mark === null) {
      throw new Error("no mark")
    }
    fireEvent.pointerEnter(mark, { pointerType: "mouse" })
    fireEvent.mouseEnter(mark)
    fireEvent.mouseMove(mark)
    expect(
      await screen.findByText(words, undefined, { timeout: 2000 })
    ).toBeTruthy()
    cleanup()
    render(
      <Wrap>
        <FieldFrame
          caption="Topology"
          hint={words}
          isOptional={false}
          note={null}
          problem={undefined}
        >
          <input aria-label="Topology" />
        </FieldFrame>
      </Wrap>
    )
    fireEvent.keyDown(document.body, { key: "Tab" })
    markOf("Topology")?.focus()
    expect(await screen.findByText(words)).toBeTruthy()
    expect(screen.getByRole("textbox", { name: "Topology" })).toBeTruthy()
  })

  it("keeps the label at the field inset, first on its line, with the mark after it", () => {
    const frame = (hint: string | null): ReactElement => (
      <FieldFrame
        caption="Topology"
        hint={hint}
        isOptional={true}
        note={null}
        problem={undefined}
      >
        <input aria-label="Topology" />
      </FieldFrame>
    )
    render(
      <Wrap>
        {frame(null)}
        {frame("Some words.")}
      </Wrap>
    )
    const captions = [
      ...document.querySelectorAll("[data-slot='field-caption']"),
    ]
    expect(captions).toHaveLength(2)
    const start = fieldInset.split(" ").find((one) => one.startsWith("ps-"))
    const [bare, marked] = captions
    expect(bare?.className).toBe(marked?.className)
    expect(marked?.className.split(" ")).toContain(start)
    expect(marked?.parentElement?.firstElementChild).toBe(marked)
    expect(marked?.nextElementSibling?.getAttribute("data-slot")).toBe(
      "field-hint"
    )
    expect(bare?.nextElementSibling?.getAttribute("data-slot")).not.toBe(
      "field-hint"
    )
  })

  it("gives a model's field Rosesfield's words first, else the words its form publishes, else no mark", () => {
    expect(fieldTipOf(topology)).toBe(settingTipOf("topology"))
    expect(fieldTipOf(frobLevel)).toBe("How much frob the model adds.")
    expect(fieldTipOf(bareFrob)).toBeNull()
    render(
      <Wrap>
        <HostedSettings fields={[frobLevel]} form={form} />
      </Wrap>
    )
    expect(markOf(fieldCaption(frobLevel))).not.toBeNull()
    cleanup()
    render(
      <Wrap>
        <HostedSettings fields={[bareFrob]} form={form} />
      </Wrap>
    )
    expect(screen.getByText(fieldCaption(bareFrob))).toBeTruthy()
    expect(markOf(fieldCaption(bareFrob))).toBeNull()
  })

  it("puts the mark beside each setting in the bar's Advanced popover", async () => {
    render(
      <Wrap>
        <ModelFieldChips fields={[topology]} form={form} output="model" />
      </Wrap>
    )
    const [advanced] = screen.getAllByRole("button", {
      name: new RegExp(t("field.advanced")),
    })
    if (advanced === undefined) {
      throw new Error("no Advanced chip")
    }
    fireEvent.click(advanced)
    expect(
      await screen.findByRole("button", {
        name: t("field.tip.label", { setting: fieldCaption(topology) }),
      })
    ).toBeTruthy()
  })
})
