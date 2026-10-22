import { ConfirmButton } from "@rosesfield/ui/components/confirm-button"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

afterEach(cleanup)

function renderConfirm() {
  const confirm = vi.fn()
  render(
    <>
      <ConfirmButton
        icon={<svg data-testid="trash" />}
        label="Delete"
        onConfirm={confirm}
      />
      <button type="button">Elsewhere</button>
    </>
  )
  const button = screen.getByRole("button", { name: "Delete" })
  const host = button.closest<HTMLElement>("[data-slot='confirm-button']")
  if (host === null) {
    throw new Error("no confirm host")
  }
  return { confirm, button, host }
}

describe("ConfirmButton", () => {
  it("deletes on the second press and never on the first", () => {
    const { confirm, button } = renderConfirm()
    fireEvent.click(button)
    expect(confirm).not.toHaveBeenCalled()
    fireEvent.click(button)
    expect(confirm).toHaveBeenCalledTimes(1)
  })

  it("arms into the danger capsule reading its label, and rests again on Escape", () => {
    const { confirm, button, host } = renderConfirm()
    expect(host.getAttribute("data-armed")).toBe("no")
    fireEvent.click(button)
    expect(host.getAttribute("data-armed")).toBe("yes")
    expect(button.className.split(" ")).toEqual(
      expect.arrayContaining(["data-[armed=yes]:bg-bug-tint", "text-bug-text"])
    )
    fireEvent.keyDown(document, { key: "Escape" })
    expect(host.getAttribute("data-armed")).toBe("no")
    fireEvent.click(button)
    expect(confirm).not.toHaveBeenCalled()
  })

  it("rests again when you press elsewhere", () => {
    const { confirm, button, host } = renderConfirm()
    fireEvent.click(button)
    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }))
    expect(host.getAttribute("data-armed")).toBe("no")
    fireEvent.click(button)
    expect(confirm).not.toHaveBeenCalled()
  })

  it("widens from its circle on the yield preset and crosses its glyph and label on the swap preset", () => {
    const { host } = renderConfirm()
    expect(host.className.split(" ")).toEqual(
      expect.arrayContaining([
        "w-(--confirm)",
        "h-(--confirm)",
        "[--confirm:var(--spacing-icon)]",
        "rounded-full",
        "motion-yield",
      ])
    )
    for (const part of ["confirm-button-glyph", "confirm-button-label"]) {
      expect(
        host.querySelector(`[data-slot='${part}']`)?.className.split(" ")
      ).toContain("motion-swap")
    }
  })
})
