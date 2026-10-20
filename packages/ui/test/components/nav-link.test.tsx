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
  it("is text only, 28 px tall with 4 by 8 px padding, flush with the next", () => {
    render(
      <nav>
        <NavLink href="/">Explore</NavLink>
        <NavLink href="/library">Library</NavLink>
      </nav>
    )
    const link = screen.getByRole("link", { name: "Explore" })
    expect(link.querySelector("svg, img")).toBeNull()
    expect(link.className.split(" ")).toEqual(
      expect.arrayContaining(["h-7", "px-2", "py-1", "hover:bg-(--tint)"])
    )
    expect(link.getAttribute("aria-current")).toBeNull()
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
})
