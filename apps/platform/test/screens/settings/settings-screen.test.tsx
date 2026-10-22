import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import {
  SettingsScreen,
  type SettingsSection,
} from "@/screens/settings/settings-screen"
import { renderAt } from "../../shell/shell-router"
import { asPhone, resetFrames } from "../app/frame-render"

afterEach(() => {
  cleanup()
  resetFrames()
})

function openSettings(section: SettingsSection | undefined): void {
  vi.stubGlobal("__APP_VERSION__", "0.1.0")
  renderAt("/settings", () => (
    <TooltipProvider>
      <SettingsScreen section={section} />
    </TooltipProvider>
  ))
}

const sectionNames = [
  t("settings.engine.title"),
  t("settings.agent.title"),
  t("settings.lock.title"),
  t("settings.appearance.title"),
  t("settings.about.title"),
]

function rowsOf(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("[data-slot='settings-row']")]
}

describe("settings on a desktop", () => {
  it("lists every section in a rail and marks the open one", async () => {
    openSettings("about")
    const rail = await screen.findByRole("navigation", {
      name: t("settings.title"),
    })
    const links = within(rail).getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual(sectionNames)
    expect(links.map((link) => link.getAttribute("aria-current"))).toEqual([
      null,
      null,
      null,
      null,
      "page",
    ])
  })

  it("draws each section as grouped 44 px rows with a lead glyph and no caption card", async () => {
    openSettings("about")
    const pane = await screen.findByRole("region", {
      name: t("settings.about.title"),
    })
    const groups = pane.querySelectorAll("[data-slot='settings-group']")
    expect(groups.length).toBeGreaterThan(0)
    const rows = rowsOf(pane)
    expect(rows.length).toBeGreaterThan(2)
    for (const row of rows) {
      expect(row.className.split(" ")).toContain("min-h-11")
      expect(
        row.querySelector("[data-slot='settings-row-lead'] svg")
      ).not.toBeNull()
      expect(row.closest("[data-slot='settings-group']")).not.toBeNull()
    }
    expect(pane.querySelector("[data-slot='card'], p")).toBeNull()
    expect(within(pane).queryByText(t("settings.about.trademark"))).toBeNull()
    expect(within(pane).queryByText(t("settings.about.welcome"))).toBeNull()
  })

  it("opens the engine section when the address names none", async () => {
    openSettings(undefined)
    expect(
      await screen.findByRole("region", { name: t("settings.engine.title") })
    ).toBeTruthy()
  })
})

describe("settings on a phone", () => {
  it("opens on the list of sections, each row ending in a chevron", async () => {
    asPhone()
    openSettings(undefined)
    const list = await screen.findByRole("navigation", {
      name: t("settings.title"),
    })
    const rows = rowsOf(list)
    expect(rows).toHaveLength(sectionNames.length)
    for (const row of rows) {
      expect(row.tagName.toLowerCase()).toBe("a")
      expect(row.lastElementChild?.tagName.toLowerCase()).toBe("svg")
    }
    expect(screen.queryByRole("region")).toBeNull()
  })

  it("pushes a section with a back circle to the list", async () => {
    asPhone()
    openSettings("appearance")
    const back = await screen.findByRole("button", {
      name: t("settings.title"),
    })
    expect(back.getAttribute("href")).toBe("/settings")
    expect(
      document.querySelector("[data-slot='settings-pushed']")?.className
    ).toContain("starting:translate-x-full")
    expect(
      screen.getByRole("heading", { name: t("settings.appearance.title") })
    ).toBeTruthy()
  })
})
