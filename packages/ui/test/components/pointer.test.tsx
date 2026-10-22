import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Checkbox } from "@rosesfield/ui/components/checkbox"
import { Chip } from "@rosesfield/ui/components/chip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import {
  FilterChip,
  SettingChoice,
} from "@rosesfield/ui/components/filter-chip"
import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import { Switch } from "@rosesfield/ui/components/switch"
import {
  ModeStrip,
  ModeTab,
  SegmentedTab,
  SegmentedTabs,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@rosesfield/ui/components/tabs"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { readSource } from "../read-source"

afterEach(cleanup)

const globals = readSource("styles/globals.css")

function selectorOf(cursor: "pointer" | "default"): string {
  const rule = new RegExp(
    `(:where\\([^{}]*\\)[^{}]*)\\{\\s*cursor: ${cursor};\\s*\\}`
  ).exec(globals)
  const selector = rule?.[1]?.trim()
  if (selector === undefined) {
    throw new Error(`globals.css holds no rule for the ${cursor} cursor`)
  }
  return selector
}

const pointer = selectorOf("pointer")
const resting = selectorOf("default")

function shows(element: Element): "pointer" | "default" | "none" {
  if (element.matches(resting)) {
    return "default"
  }
  return element.matches(pointer) ? "pointer" : "none"
}

describe("the pointer rule", () => {
  it("sits outside the layers, so no component or screen cursor stands over it", () => {
    const start = globals.indexOf(pointer)
    const before = globals.slice(0, start)
    const opened = (before.match(/\{/g) ?? []).length
    const closed = (before.match(/\}/g) ?? []).length
    expect(opened).toBe(closed)
  })

  it("shows the pointer on every kind of kernel pressable", () => {
    render(
      <>
        <Button>Generate</Button>
        <IconButton label="Close">
          <svg aria-hidden="true" />
        </IconButton>
        <Chip>16:9</Chip>
        <FilterChip href="/apps/effects?preset=melt">Melt</FilterChip>
        <SettingChoice
          label="Square"
          picture={<svg aria-hidden="true" />}
          isCurrent={false}
          onChoose={() => undefined}
        />
        <Switch aria-label="Ask before each run" />
        <Checkbox aria-label="Keep" />
        <SegmentedControl
          label="Format"
          items={[
            { value: "a", label: "1:1" },
            { value: "b", label: "4:3" },
          ]}
          value="a"
          onValueChange={() => undefined}
        />
        <Tabs defaultValue="one">
          <TabsList aria-label="Pill tabs">
            <TabsTrigger value="one">Pill</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs defaultValue="one">
          <ModeStrip aria-label="Mode tabs">
            <ModeTab value="one">Mode</ModeTab>
          </ModeStrip>
        </Tabs>
        <Tabs defaultValue="one">
          <SegmentedTabs aria-label="Segment tabs">
            <SegmentedTab value="one">Segment</SegmentedTab>
          </SegmentedTabs>
        </Tabs>
      </>
    )
    const pressables = [
      screen.getByRole("button", { name: "Generate" }),
      screen.getByRole("button", { name: "Close" }),
      screen.getByRole("button", { name: "16:9" }),
      screen.getByRole("link", { name: "Melt" }),
      screen.getByRole("button", { name: "Square" }),
      screen.getByRole("switch", { name: "Ask before each run" }),
      screen.getByRole("checkbox", { name: "Keep" }),
      screen.getByRole("radio", { name: "4:3" }),
      screen.getByRole("tab", { name: "Pill" }),
      screen.getByRole("tab", { name: "Mode" }),
      screen.getByRole("tab", { name: "Segment" }),
    ]
    for (const pressable of pressables) {
      expect(shows(pressable), pressable.outerHTML.slice(0, 80)).toBe("pointer")
    }
  })

  it("shows the pointer on a menu item and a menu choice", () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>More</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuRadioGroup value="grid">
            <DropdownMenuRadioItem value="grid">Grid</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(shows(screen.getByRole("menuitem", { name: "Rename" }))).toBe(
      "pointer"
    )
    expect(shows(screen.getByRole("menuitemradio", { name: "Grid" }))).toBe(
      "pointer"
    )
  })

  it("shows the default cursor on a disabled pressable", () => {
    render(
      <>
        <Button disabled>Generate</Button>
        <Switch aria-label="Ask before each run" disabled />
        <SegmentedControl
          label="Format"
          items={[
            { value: "a", label: "1:1" },
            { value: "b", label: "4:3" },
          ]}
          value="a"
          onValueChange={() => undefined}
          disabled
        />
        <Tabs defaultValue="one">
          <SegmentedTabs aria-label="Segment tabs">
            <SegmentedTab value="one">Segment</SegmentedTab>
            <SegmentedTab value="two" disabled>
              Later
            </SegmentedTab>
          </SegmentedTabs>
        </Tabs>
      </>
    )
    const disabled = [
      screen.getByRole("button", { name: "Generate" }),
      screen.getByRole("switch", { name: "Ask before each run" }),
      screen.getByRole("radio", { name: "4:3" }),
      screen.getByRole("tab", { name: "Later" }),
    ]
    for (const pressable of disabled) {
      expect(shows(pressable), pressable.outerHTML.slice(0, 80)).toBe("default")
    }
  })

  it("keeps the default on a hidden press target and on what presses nothing", () => {
    render(
      <>
        <button type="button" aria-hidden="true" tabIndex={-1} />
        <span>Words</span>
      </>
    )
    const hidden = document.querySelector("button[aria-hidden='true']")
    expect(hidden === null ? "missing" : shows(hidden)).toBe("none")
    expect(shows(screen.getByText("Words"))).toBe("none")
  })
})
