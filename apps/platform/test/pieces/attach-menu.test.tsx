import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { AttachMenu } from "@/pieces/attach-menu"

afterEach(cleanup)

function renderMenu(form?: "tile" | "menu", disabled = false): string[] {
  const calls: string[] = []
  render(
    <TooltipProvider>
      <AttachMenu
        label={t("bar.attach")}
        onUpload={() => calls.push("upload")}
        onFromLibrary={() => calls.push("library")}
        disabled={disabled}
        {...(form === undefined ? {} : { form })}
      />
    </TooltipProvider>
  )
  return calls
}

describe("the References and Elements tile", () => {
  it("leads the chip row with References for an upload and Elements for your library", () => {
    const calls = renderMenu()
    fireEvent.click(screen.getByRole("button", { name: t("bar.references") }))
    fireEvent.click(screen.getByRole("button", { name: t("bar.elements") }))
    expect(calls).toEqual(["upload", "library"])
    const tile = document.querySelector('[data-slot="composer-attachments-edge"]')
    expect(tile?.querySelectorAll("button")).toHaveLength(2)
    expect(tile?.className).toContain("w-16.25")
    expect(tile?.className).toContain("h-8")
  })

  it("takes no press while it is disabled", () => {
    renderMenu("tile", true)
    const tile = document.querySelector('[data-slot="attach-tile"]')
    expect(tile).toHaveProperty("disabled", true)
    expect(tile?.contains(screen.getByRole("button", { name: t("bar.references") }))).toBe(true)
  })

  it("stays one attach button where a composer asks for the menu", () => {
    renderMenu("menu")
    expect(
      screen.getByRole("button", { name: t("bar.attach") })
    ).toBeDefined()
    expect(screen.queryByRole("button", { name: t("bar.references") })).toBeNull()
  })
})
