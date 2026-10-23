import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { KindTabs, type LibraryKind } from "@/screens/library/library-bars"

afterEach(cleanup)

describe("the library's kind filter", () => {
  it("offers 3D models beside images, videos and sound, and picks mesh", () => {
    const onKind = vi.fn<(kind: LibraryKind) => void>()
    render(<KindTabs kind="all" onKind={onKind} isRegular />)
    fireEvent.click(screen.getByRole("radio", { name: "3D" }))
    expect(onKind).toHaveBeenCalledWith("mesh")
  })
})
