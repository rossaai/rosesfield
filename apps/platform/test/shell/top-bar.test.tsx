import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { catalogApps } from "@/catalog/catalog-apps"
import { TopBar } from "@/shell/top-bar"
import { ownerSettings, renderAt } from "./shell-router"

afterEach(cleanup)

async function barAt(path: string): Promise<HTMLElement> {
  renderAt(path, () => <TopBar />)
  return screen.findByRole("banner", { name: "Rosesfield" })
}

function areaLabels(bar: HTMLElement): string[] {
  return [...bar.querySelectorAll("[data-slot='app-bar-areas']")].map(
    (element) => element.textContent ?? ""
  )
}

function balancePill(bar: HTMLElement): HTMLElement {
  const pill = within(bar)
    .getAllByRole("button", { name: "13 credits" })
    .find((button) => button.textContent === "13")
  if (pill === undefined) {
    throw new Error("the bar holds no balance pill")
  }
  return pill
}

function endOf(bar: HTMLElement): HTMLElement {
  const end = bar.querySelector<HTMLElement>(
    "[data-slot='app-bar-balance']"
  )?.parentElement
  if (end === null || end === undefined) {
    throw new Error("the bar holds no top right")
  }
  return end
}

function currentOf(
  bar: HTMLElement,
  role: "link" | "button",
  name: string | RegExp
): string | null {
  return within(bar).getByRole(role, { name }).getAttribute("aria-current")
}

describe("the top bar", () => {
  it("spans the page in full density with no sidebar", async () => {
    const bar = await barAt("/")
    expect(bar.getAttribute("data-density")).toBe("full")
    expect(document.querySelector("[data-slot='sidebar']")).toBeNull()
  })

  it("opens Explore from the logo on every page, the mark and the wordmark alike", async () => {
    for (const path of ["/", "/apps/image", "/library", "/settings"]) {
      const bar = await barAt(path)
      const logos = within(bar).getAllByRole("link", { name: /^Rosesfield/ })
      expect(logos, path).toHaveLength(2)
      for (const logo of logos) {
        expect(logo.getAttribute("href"), path).toBe("/")
      }
      cleanup()
    }
  })

  it("lists Explore, the media areas, MCP, a separator, the featured pair, a separator, then the rest", async () => {
    const bar = await barAt("/")
    expect(areaLabels(bar)).toEqual([
      "Explore",
      "Image",
      "Video",
      "Audio",
      "3D",
      "MCP",
      "AgentFeatured",
      "MotionFeatured",
      "Characters",
      "Library",
      "History",
      "Settings",
    ])
    const separators = [
      ...bar.querySelectorAll("[data-slot='nav-separator']"),
    ].map((separator) => [
      separator.previousElementSibling?.textContent,
      separator.nextElementSibling?.textContent,
    ])
    expect(separators).toEqual([
      ["MCP", "AgentFeatured"],
      ["MotionFeatured", "Characters"],
    ])
  })

  it("stands the Agent and Motion side by side, the Agent first, each with the one Featured badge", async () => {
    const bar = await barAt("/")
    const agent = within(bar).getByRole("link", { name: /^Agent/ })
    const motion = within(bar).getByRole("link", { name: /^Motion/ })
    expect(agent.getAttribute("href")).toBe("/agent")
    expect(motion.getAttribute("href")).toBe("/apps/motion")
    expect(agent.nextElementSibling).toBe(motion)
    for (const entry of [agent, motion]) {
      const badge = entry.querySelector("[data-slot='badge']")
      expect(badge?.getAttribute("data-kind")).toBe("featured")
      expect(badge?.getAttribute("data-tone")).toBe("bug")
      expect(badge?.textContent).toBe("Featured")
    }
    const mcp = within(bar).getByRole("button", { name: "MCP" })
    expect(mcp.querySelector("[data-slot='badge']")).toBeNull()
    const badged = [
      ...bar.querySelectorAll(
        "[data-slot='app-bar-areas'] [data-slot='badge']"
      ),
    ]
    expect(badged).toHaveLength(2)
  })

  it("lists Motion in the Video menu right after Video as well, with its Featured badge drawn as the model picker's", async () => {
    const bar = await barAt("/")
    fireEvent.click(within(bar).getByRole("button", { name: "Video" }))
    const menu = await screen.findByRole("menu")
    const rows = within(menu).getAllByRole("menuitem")
    expect(rows.slice(0, 2).map((row) => row.getAttribute("href"))).toEqual([
      "/apps/video",
      "/apps/motion",
    ])
    const badge = rows[1]?.querySelector("[data-slot='badge']")
    expect(badge?.getAttribute("data-kind")).toBe("featured")
    expect(badge?.getAttribute("data-tone")).toBe("bug")
    expect(badge?.textContent).toBe("Featured")
    expect(rows[0]?.querySelector("[data-slot='badge']")).toBeNull()
  })

  it("lights Motion in the pair on Motion's page, and no area beside it", async () => {
    const bar = await barAt("/apps/motion")
    expect(currentOf(bar, "link", /^Motion/)).toBe("page")
    expect(currentOf(bar, "link", /^Agent/)).toBeNull()
    expect(currentOf(bar, "button", "Video")).toBeNull()
    expect(currentOf(bar, "button", "Image")).toBeNull()
  })

  it("lights the Agent in the pair on the Agent's page", async () => {
    const bar = await barAt("/agent")
    expect(currentOf(bar, "link", /^Agent/)).toBe("page")
    expect(currentOf(bar, "link", /^Motion/)).toBeNull()
  })

  it("marks Explore current on Explore", async () => {
    const bar = await barAt("/")
    expect(currentOf(bar, "link", "Explore")).toBe("page")
    expect(currentOf(bar, "link", "Library")).toBeNull()
  })

  it("opens Settings from an app page as a button over that page, never as a link that leaves it", async () => {
    const bar = await barAt("/apps/image")
    expect(within(bar).getByRole("button", { name: "Settings" })).toBeTruthy()
    expect(within(bar).queryByRole("link", { name: "Settings" })).toBeNull()
  })

  it("turns compact on an app page and marks the area of the open app", async () => {
    const bar = await barAt("/apps/image")
    expect(bar.getAttribute("data-density")).toBe("compact")
    expect(currentOf(bar, "link", "Explore")).toBeNull()
    expect(currentOf(bar, "button", "Image")).toBe("page")
    expect(currentOf(bar, "button", "Video")).toBeNull()
  })

  it("ends with your balance pill, a button that opens a dialog, and no Connect at the top right", async () => {
    const bar = await barAt("/")
    const balance = balancePill(bar)
    expect(balance.getAttribute("href")).toBeNull()
    expect(within(bar).queryByRole("button", { name: "Connect" })).toBeNull()
    expect(within(bar).queryByRole("link", { name: "Connect" })).toBeNull()
    expect(bar.querySelector("[data-slot='app-bar-connect']")).toBeNull()
    const end = endOf(bar)
    expect(end.contains(balance)).toBe(true)
    expect(within(end).queryByRole("button", { name: "MCP" })).toBeNull()
    expect(balance.className.split(" ")).toContain("h-button")
    expect(balance.className.split(" ")).not.toContain(
      "@regular:h-button-small"
    )
  })

  it("draws the balance with its icon before the label", async () => {
    const bar = await barAt("/")
    const balance = balancePill(bar)
    expect(balance.firstElementChild?.tagName.toLowerCase()).toBe("svg")
    expect(balance.lastElementChild?.textContent).toBe("13")
  })

  it("collapses the balance to a key circle on a compact width, named by its label", async () => {
    const bar = await barAt("/")
    const circle = within(bar)
      .getAllByRole("button", { name: "13 credits" })
      .find((button) => button.textContent === "")
    expect(circle?.parentElement?.className.split(" ")).toContain(
      "@regular:hidden"
    )
    expect(circle?.querySelector("svg")).not.toBeNull()
    expect(balancePill(bar).closest(".hidden")).not.toBeNull()
  })

  it("shrinks the balance with the bar on an app page", async () => {
    const bar = await barAt("/apps/image")
    expect(balancePill(bar).className.split(" ")).toContain(
      "@regular:h-button-small"
    )
  })

  it("holds Add your Comfy key alone at the top right when this browser holds no key, with no Connect beside it", async () => {
    renderAt("/", () => <TopBar />, {
      settings: { ...ownerSettings, mode: "public", keyFrom: "settings" },
    })
    const bar = await screen.findByRole("banner", { name: "Rosesfield" })
    const keys = within(bar).getAllByRole("button", {
      name: "Add your Comfy key",
    })
    expect(keys.map((button) => button.textContent)).toEqual([
      "",
      "Add your Comfy key",
    ])
    expect(within(bar).queryByRole("button", { name: "Connect" })).toBeNull()
    expect(endOf(bar).contains(keys[1] ?? null)).toBe(true)
    expect(within(bar).queryByRole("button", { name: /credits/ })).toBeNull()
  })

  it("draws Add your Comfy key in ink as the bar's one primary button when this browser holds no key", async () => {
    renderAt("/", () => <TopBar />, {
      settings: { ...ownerSettings, mode: "public", keyFrom: "settings" },
    })
    const bar = await screen.findByRole("banner", { name: "Rosesfield" })
    const keys = within(bar).getAllByRole("button", {
      name: "Add your Comfy key",
    })
    for (const key of keys) {
      expect(key.className.split(" ")).toEqual(
        expect.arrayContaining(["bg-ink", "text-canvas"])
      )
    }
    const inked = [...bar.querySelectorAll("button")].filter((button) =>
      button.className.split(" ").includes("bg-ink")
    )
    expect(inked).toEqual(keys)
  })

  it("draws the balance in the quiet register with no primary button once a key is saved", async () => {
    const bar = await barAt("/")
    const circle = within(bar)
      .getAllByRole("button", { name: "13 credits" })
      .find((button) => button.textContent === "")
    expect(circle?.className.split(" ")).toContain("bg-transparent")
    expect(balancePill(bar).className.split(" ")).toContain("bg-(--well)")
    expect(
      [...bar.querySelectorAll("button")].some((button) =>
        button.className.split(" ").includes("bg-ink")
      )
    ).toBe(false)
  })

  it("holds a pill skeleton in the balance's place while settings load", async () => {
    renderAt("/", () => <TopBar />, {})
    const bar = await screen.findByRole("banner", { name: "Rosesfield" })
    const skeleton = bar.querySelector("[data-slot='balance-skeleton']")
    expect(skeleton).not.toBeNull()
    expect(endOf(bar).contains(skeleton)).toBe(true)
  })

  it("opens the Image menu with each image app, its icon and one line", async () => {
    const bar = await barAt("/")
    fireEvent.mouseDown(within(bar).getByRole("button", { name: "Image" }))
    const items = await screen.findAllByRole("menuitem")
    const imageApps = catalogApps.filter(
      (app) => app.category === "image" && app.output.kind === "image"
    )
    expect(items.map((item) => item.getAttribute("href"))).toEqual(
      imageApps.map((app) => `/apps/${app.id}`)
    )
    expect(items.slice(0, 3).map((item) => item.getAttribute("href"))).toEqual([
      "/apps/image",
      "/apps/edit",
      "/apps/upscale",
    ])
    for (const item of items) {
      expect(item.querySelector("svg")).not.toBeNull()
      expect(item.querySelectorAll("span > span")).toHaveLength(2)
    }
  })

  it("holds the wordmark and a menu of every area for a phone", async () => {
    const bar = await barAt("/")
    const names = within(bar).getAllByRole("img", { name: "Rosesfield" })
    expect(names).toHaveLength(2)
    const menu = within(bar).getByRole("button", { name: "Open the menu" })
    fireEvent.mouseDown(menu)
    const items = await screen.findAllByRole("menuitem")
    const media = catalogApps.filter((app) => app.category !== "character")
    expect(items[0]?.textContent).toBe("Explore")
    expect(items.map((item) => item.textContent)).toContain("Library")
    expect(items).toHaveLength(media.length + 8)
    const content = items[0]?.closest("[data-slot='dropdown-menu-content']")
    const marks = [
      ...(content?.querySelectorAll(
        "[role='menuitem'], [data-slot='dropdown-menu-separator']"
      ) ?? []),
    ].map((node) =>
      node.getAttribute("data-slot") === "dropdown-menu-separator"
        ? "|"
        : (node.textContent ?? "")
    )
    expect(marks.slice(media.length + 1)).toEqual([
      "|",
      "MCP",
      "|",
      "AgentFeatured",
      "MotionFeatured",
      "|",
      "Characters",
      "Library",
      "History",
      "Settings",
    ])
  })
})
