import {
  AreaMenu,
  NavLink,
  NavSeparator,
} from "@rosesfield/ui/components/nav-link"
import { cleanup, render, screen } from "@testing-library/react"
import type { ComponentProps, ReactElement } from "react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

describe("NavLink", () => {
  it("is text only, at the record's linkHeight and linkRadius, 26 px with the dense radius and 10 px sides, and presses on the press preset", () => {
    render(
      <nav>
        <NavLink href="/">Explore</NavLink>
        <NavLink href="/library">Library</NavLink>
      </nav>
    )
    const link = screen.getByRole("link", { name: "Explore" })
    expect(link.querySelector("svg, img")).toBeNull()
    expect(link.className.split(" ")).toEqual(
      expect.arrayContaining([
        "h-button-small",
        "px-s3",
        "rounded-dense",
        "hover:bg-(--tint)",
        "motion-press",
      ])
    )
    expect(link.getAttribute("aria-current")).toBeNull()
  })

  it("brightens a link's text to ink on hover, beside the fill", () => {
    render(<NavLink href="/library">Library</NavLink>)
    const link = screen.getByRole("link", { name: "Library" })
    expect(link.className.split(" ")).toEqual(
      expect.arrayContaining([
        "text-ink-muted",
        "hover:text-ink",
        "in-data-[gallery=hover]:text-ink",
        "hover:bg-(--tint)",
      ])
    )
  })

  it("marks the current link by its text only", () => {
    render(
      <NavLink href="/" current>
        Explore
      </NavLink>
    )
    const link = screen.getByRole("link", { name: "Explore" })
    expect(link.getAttribute("aria-current")).toBe("page")
    expect(link.className).toContain("aria-[current=page]:text-ink")
    expect(link.className).not.toMatch(/aria-\[current=page\]:bg-/)
  })

  it("draws a 1 by 12 px separator", () => {
    const { container } = render(<NavSeparator />)
    expect(container.firstElementChild?.className.split(" ")).toEqual(
      expect.arrayContaining(["h-3", "w-px", "mx-1"])
    )
  })
})

function RouterLink(props: ComponentProps<"a">): ReactElement {
  return <a {...props} data-router="yes" />
}

describe("AreaMenu", () => {
  const apps = [
    {
      id: "image",
      name: "Image",
      line: "Words to a picture",
      icon: <svg />,
      href: "/apps/image",
    },
  ]

  it("renders each app with the link the caller gives, such as the router's", () => {
    render(
      <AreaMenu
        apps={apps}
        defaultOpen
        renderLink={(app) => <RouterLink href={app.href} />}
      >
        Image
      </AreaMenu>
    )
    const item = screen.getByRole("menuitem", { name: /Words to a picture/ })
    expect(item.getAttribute("data-router")).toBe("yes")
    expect(item.getAttribute("href")).toBe("/apps/image")
  })

  it("keeps a plain link by default", () => {
    render(
      <AreaMenu apps={apps} defaultOpen>
        Image
      </AreaMenu>
    )
    const item = screen.getByRole("menuitem", { name: /Words to a picture/ })
    expect(item.tagName).toBe("A")
    expect(item.getAttribute("href")).toBe("/apps/image")
    expect(item.hasAttribute("data-router")).toBe(false)
  })

  function menuOf(count: number): HTMLElement {
    const many = Array.from({ length: count }, (_, index) => ({
      ...apps[0],
      id: `app-${index}`,
      name: "Image",
      line: "Words to a picture",
      icon: <svg />,
      href: `/apps/app-${index}`,
    }))
    render(
      <AreaMenu apps={many} defaultOpen>
        Image
      </AreaMenu>
    )
    const menu = document.querySelector<HTMLElement>(
      "[data-slot='app-bar-areaMenu']"
    )
    if (menu === null) {
      throw new Error("the area menu did not open")
    }
    return menu
  }

  it("opens at one fixed width, 416 px with one column and 832 px with two, capped by the viewport and never growing with its text", () => {
    const one = menuOf(4).className.split(" ")
    expect(one).toEqual(
      expect.arrayContaining([
        "w-104",
        "max-w-[calc(100vw-2*var(--spacing-s4))]",
        "data-[columns=two]:w-208",
      ])
    )
    expect(
      one.some((name) => /(^|:)(min-w-(?!0$)|max-w-none)/.test(name))
    ).toBe(false)
    cleanup()
    expect(menuOf(5).getAttribute("data-columns")).toBe("two")
  })

  it("cuts a long name and a long line with an ellipsis inside its column", () => {
    const menu = menuOf(1)
    const item = menu.querySelector("[role='menuitem']")
    expect(item?.className.split(" ")).toContain("min-w-0")
    const texts = [...(item?.querySelectorAll("span > span") ?? [])]
    expect(
      texts.map((text) => text.className.split(" ").includes("truncate"))
    ).toEqual([true, true])
  })
})
