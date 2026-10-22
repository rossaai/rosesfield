import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { t } from "@/copy/t"
import {
  placeAfter,
  SettingsModal,
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

const identityName = t("settings.target.comfy-cloud")

const sectionNames = [
  t("settings.agent.title"),
  t("settings.lock.title"),
  t("settings.appearance.title"),
  t("settings.about.title"),
]

function rowsOf(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("[data-slot='settings-row']")]
}

function openModal(
  section: SettingsSection,
  onSection: (section: SettingsSection) => void = () => undefined
): void {
  vi.stubGlobal("__APP_VERSION__", "0.1.0")
  renderAt("/", () => (
    <TooltipProvider>
      <SettingsModal
        open={true}
        place={{ section, arrival: "none" }}
        onSection={onSection}
        onOpenChange={() => undefined}
      />
    </TooltipProvider>
  ))
}

describe("settings on a desktop", () => {
  it("opens as a modal at the settings measure, not as a page", async () => {
    openModal("engine")
    const dialog = await screen.findByRole("dialog")
    expect(dialog.getAttribute("data-slot")).toBe("settings-modal")
    expect(dialog.className).toContain("var(--spacing-settings-modal-w)")
    expect(dialog.className).toContain("var(--spacing-settings-modal-h)")
    expect(document.querySelector("[data-slot='dialog-scrim']")).not.toBeNull()
  })

  it("heads the rail with the engine's identity row, lists the other sections, and moves one tint capsule to the open one", async () => {
    const onSection = vi.fn<(section: SettingsSection) => void>()
    openModal("about", onSection)
    const rail = await screen.findByRole("navigation", {
      name: t("settings.title"),
    })
    const identity = rail.querySelector<HTMLElement>(
      "[data-slot='settings-identity']"
    )
    expect(identity?.textContent).toBe(identityName)
    expect(
      identity
        ?.querySelector("[data-slot='lab-mark']")
        ?.getAttribute("data-maker")
    ).toBe("Comfy")
    const rows = rowsOf(rail)
    expect(rows.map((row) => row.textContent)).toEqual(sectionNames)
    expect(rows.map((row) => row.getAttribute("aria-current"))).toEqual([
      null,
      null,
      null,
      "page",
    ])
    const thumb = rail.querySelector<HTMLElement>(
      "[data-slot='settings-rail-thumb']"
    )
    expect(thumb?.className.split(" ")).toEqual(
      expect.arrayContaining(["bg-(--tint)", "motion-travel"])
    )
    expect(thumb?.className.split(" ")).not.toContain("bg-ink")
    expect(rail.getAttribute("data-ground")).toBe("surface")
    expect(thumb?.style.translate).toContain("3 *")
    fireEvent.click(
      within(rail).getByRole("button", { name: t("settings.agent.title") })
    )
    expect(onSection).toHaveBeenCalledWith("agent")
    fireEvent.click(within(rail).getByRole("button", { name: identityName }))
    expect(onSection).toHaveBeenCalledWith("engine")
  })

  it("seats the close circle over the pane's head, level with the first row", async () => {
    openModal("engine")
    const dialog = await screen.findByRole("dialog")
    expect(dialog.className).toContain("[&>[data-slot=tooltip-trigger]]:z-2")
    expect(dialog.className).toContain("[&>[data-slot=tooltip-trigger]]:top-s4")
    const close = within(dialog).getByRole("button", {
      name: t("viewer.close"),
    })
    expect(close.parentElement).toBe(dialog)
    expect(close.getAttribute("data-slot")).toBe("tooltip-trigger")
    const head = dialog.querySelector(
      "[data-slot='settings-modal-pane'] header"
    )
    expect(head?.className).toContain(
      "h-[calc(2*var(--spacing-s4)+var(--spacing-button))]"
    )
  })

  it("draws a pane as 36 px rows in groups that each open with a heading", async () => {
    openModal("about")
    const pane = await screen.findByRole("region", {
      name: t("settings.about.title"),
    })
    const groups = [
      ...pane.querySelectorAll<HTMLElement>("[data-slot='settings-group']"),
    ]
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      const heading = group.querySelector("[data-slot='section-heading']")
      expect(heading?.className.split(" ")).toEqual(
        expect.arrayContaining(["h-tab", "text-label"])
      )
    }
    const rows = rowsOf(pane)
    expect(rows.length).toBeGreaterThan(2)
    for (const row of rows) {
      expect(row.className.split(" ")).toEqual(
        expect.arrayContaining(["min-h-button", "py-0"])
      )
      expect(row.className.split(" ")).not.toContain("min-h-11")
      expect(row.className.split(" ")).toContain(
        "@max-regular:min-h-[round(var(--spacing-button)*17/14,var(--spacing-hairline))]"
      )
    }
    const titles = [...pane.querySelectorAll("h2")]
    expect(titles).toHaveLength(1)
    expect(titles[0]?.closest("header")?.className.split(" ")).toContain(
      "sticky"
    )
    expect(titles[0]?.className.split(" ")).toContain("text-body")
    expect(within(pane).queryByText(t("settings.about.trademark"))).toBeNull()
  })

  it("shows the scheme as one select row with its value and a menu that checks the choice", async () => {
    openModal("appearance")
    const pane = await screen.findByRole("region", {
      name: t("settings.appearance.title"),
    })
    const row = within(pane).getByRole("button", {
      name: new RegExp(t("settings.theme.label")),
    })
    expect(
      row.querySelector("[data-slot='settings-row-value']")?.textContent
    ).toBe(t("settings.theme.system"))
    expect(row.lastElementChild?.tagName.toLowerCase()).toBe("svg")
    expect(within(pane).queryAllByRole("radio")).toEqual([])
    fireEvent.click(row)
    const items = await screen.findAllByRole("menuitemradio")
    expect(items.map((item) => item.textContent)).toEqual([
      t("settings.theme.system"),
      t("settings.theme.light"),
      t("settings.theme.dark"),
    ])
    expect(items[0]?.getAttribute("aria-checked")).toBe("true")
  })

  it("brings a pane in from the side of the rail its selection moved toward", () => {
    const start = { section: "agent" as const, arrival: "none" as const }
    expect(placeAfter(start, "about")).toEqual({
      section: "about",
      arrival: "below",
    })
    expect(placeAfter(start, "engine")).toEqual({
      section: "engine",
      arrival: "above",
    })
    expect(placeAfter(start, "agent")).toBe(start)
  })
})

describe("settings on a phone", () => {
  it("opens on the list of sections, each row ending in a chevron", async () => {
    asPhone()
    openSettings(undefined)
    const list = await screen.findByRole("navigation", {
      name: t("settings.title"),
    })
    const identity = list.querySelector<HTMLElement>(
      "[data-slot='settings-identity']"
    )
    expect(identity?.textContent).toBe(identityName)
    expect(identity?.getAttribute("href")).toBe("/settings?section=engine")
    const rows = rowsOf(list)
    expect(rows.map((row) => row.textContent)).toEqual(sectionNames)
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
