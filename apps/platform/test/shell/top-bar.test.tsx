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

function connectOf(bar: HTMLElement): HTMLElement {
  const connect = within(bar)
    .getAllByRole("button", { name: "Connect" })
    .find((button) => button.textContent === "Connect")
  if (connect === undefined) {
    throw new Error("the bar holds no Connect action")
  }
  return connect
}

function currentOf(
  bar: HTMLElement,
  role: "link" | "button",
  name: string
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

  it("lists Explore, the media areas, a separator, then the rest", async () => {
    const bar = await barAt("/")
    expect(areaLabels(bar)).toEqual([
      "Explore",
      "Image",
      "Video",
      "Audio",
      "Characters",
      "Agent",
      "Library",
      "History",
      "Settings",
    ])
    const separator = bar.querySelector("[data-slot='nav-separator']")
    expect(separator?.previousElementSibling?.textContent).toBe("Audio")
    expect(separator?.nextElementSibling?.textContent).toBe("Characters")
  })

  it("marks Explore current on Explore", async () => {
    const bar = await barAt("/")
    expect(currentOf(bar, "link", "Explore")).toBe("page")
    expect(currentOf(bar, "link", "Library")).toBeNull()
  })

  it("turns compact on an app page and marks the area of the open app", async () => {
    const bar = await barAt("/apps/image")
    expect(bar.getAttribute("data-density")).toBe("compact")
    expect(currentOf(bar, "link", "Explore")).toBeNull()
    expect(currentOf(bar, "button", "Image")).toBe("page")
    expect(currentOf(bar, "button", "Video")).toBeNull()
  })

  it("ends with your balance pill, then Connect, both buttons that open a dialog, not pages", async () => {
    const bar = await barAt("/")
    const balance = balancePill(bar)
    const connect = connectOf(bar)
    expect(balance.getAttribute("href")).toBeNull()
    expect(connect.getAttribute("href")).toBeNull()
    expect(within(bar).queryByRole("link", { name: "Connect" })).toBeNull()
    const order = balance.compareDocumentPosition(connect)
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(connect.className.split(" ")).toContain("h-button")
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

  it("shrinks the balance and Connect with the bar on an app page", async () => {
    const bar = await barAt("/apps/image")
    for (const button of [connectOf(bar), balancePill(bar)]) {
      expect(button.className.split(" ")).toContain("@regular:h-button-small")
    }
  })

  it("holds one Connect action and no key pill when this browser holds no key", async () => {
    renderAt("/", () => <TopBar />, {
      settings: { ...ownerSettings, mode: "public", keyFrom: "settings" },
    })
    const bar = await screen.findByRole("banner", { name: "Rosesfield" })
    expect(
      within(bar).queryByRole("button", { name: "Add your Comfy key" })
    ).toBeNull()
    const connects = within(bar).getAllByRole("button", { name: "Connect" })
    expect(connects.map((button) => button.textContent)).toEqual([
      "",
      "Connect",
    ])
    expect(within(bar).queryByRole("button", { name: /credits/ })).toBeNull()
  })

  it("holds a pill skeleton in the balance's place while settings load", async () => {
    renderAt("/", () => <TopBar />, {})
    const bar = await screen.findByRole("banner", { name: "Rosesfield" })
    const skeleton = bar.querySelector("[data-slot='balance-skeleton']")
    expect(skeleton).not.toBeNull()
    expect(
      skeleton?.compareDocumentPosition(connectOf(bar)) ??
        Node.DOCUMENT_POSITION_PRECEDING
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it("opens the Image menu with each image app, its icon and one line", async () => {
    const bar = await barAt("/")
    fireEvent.mouseDown(within(bar).getByRole("button", { name: "Image" }))
    const items = await screen.findAllByRole("menuitem")
    const imageApps = catalogApps.filter((app) => app.category === "image")
    expect(items.map((item) => item.getAttribute("href"))).toEqual(
      imageApps.map((app) => `/apps/${app.id}`)
    )
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
    expect(items).toHaveLength(media.length + 6)
  })
})
