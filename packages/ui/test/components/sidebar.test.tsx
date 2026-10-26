import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarName,
} from "@rosesfield/ui/components/sidebar"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

afterEach(cleanup)

function sidebarOf(variant?: "flush" | "inset"): HTMLElement {
  const { container } = render(
    <Sidebar {...(variant === undefined ? {} : { variant })}>
      <SidebarHeader>
        <SidebarName>Conversations</SidebarName>
      </SidebarHeader>
      <SidebarContent />
    </Sidebar>
  )
  const aside = container.querySelector<HTMLElement>("[data-slot='sidebar']")
  if (aside === null) {
    throw new Error("the sidebar did not render")
  }
  return aside
}

describe("Sidebar", () => {
  it("sits flush with square corners by default", () => {
    const aside = sidebarOf()
    expect(aside.getAttribute("data-variant")).toBe("flush")
    expect(aside.className.split(" ")).not.toContain("rounded-card")
  })

  it("draws the inset variant as a rounded surface panel whose header and rows keep 16 px sides", () => {
    const aside = sidebarOf("inset")
    expect(aside.getAttribute("data-variant")).toBe("inset")
    expect(aside.className.split(" ")).toEqual(
      expect.arrayContaining(["rounded-card", "bg-surface", "overflow-hidden"])
    )
    const header = aside.querySelector("[data-slot='sidebar-header']")
    const content = aside.querySelector("[data-slot='sidebar-content']")
    expect(header?.className.split(" ")).toContain(
      "in-data-[variant=inset]:pl-4"
    )
    expect(content?.className.split(" ")).toContain(
      "in-data-[variant=inset]:px-4"
    )
  })
})
