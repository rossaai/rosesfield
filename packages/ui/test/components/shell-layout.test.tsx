import { ShellLayout } from "@rosesfield/ui/components/shell-layout"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarItem,
  SidebarToggle,
} from "@rosesfield/ui/components/sidebar"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

const key = "test.sidebar"

function renderShell(): void {
  render(
    <ShellLayout
      storageKey={key}
      title="Home"
      menuLabel="Open the menu"
      closeMenuLabel="Close the menu"
      sidebar={
        <Sidebar>
          <SidebarHeader>
            <SidebarToggle
              collapseLabel="Collapse the sidebar"
              expandLabel="Expand the sidebar"
            />
          </SidebarHeader>
          <SidebarContent>
            <SidebarItem icon={null} label="Library" />
          </SidebarContent>
        </Sidebar>
      }
    >
      content
    </ShellLayout>
  )
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe("ShellLayout sidebar", () => {
  it("collapses to the rail and keeps the row's name for its tooltip", () => {
    renderShell()
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse the sidebar" })
    )
    const sidebar = document.querySelector("[data-slot='sidebar']")
    expect(sidebar?.getAttribute("data-width")).toBe("rail")
    const row = screen.getByRole("button", { name: "Library" })
    expect(row.textContent).toBe("")
  })

  it("keeps the rail for this browser", () => {
    renderShell()
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse the sidebar" })
    )
    cleanup()
    renderShell()
    expect(
      screen.queryByRole("button", { name: "Expand the sidebar" })
    ).not.toBeNull()
  })
})
