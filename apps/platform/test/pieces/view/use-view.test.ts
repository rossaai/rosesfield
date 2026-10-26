import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { parseViewChoice, useView } from "@/pieces/view/use-view"

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe("a place's view", () => {
  it("opens on Grid at the second tile size, with no words", () => {
    const { result } = renderHook(() => useView("library"))
    expect(result.current.layout).toBe("grid")
    expect(result.current.size).toBe(1)
    expect(result.current.words).toBe("")
  })

  it("keeps the layout and size you choose for that place in this browser, and no other place", () => {
    const first = renderHook(() => useView("history"))
    act(() => first.result.current.setLayout("list"))
    act(() => first.result.current.setSize(3))
    expect(first.result.current).toMatchObject({ layout: "list", size: 3 })
    expect(
      JSON.parse(window.localStorage.getItem("rosesfield.view.history") ?? "")
    ).toEqual({ layout: "list", size: 3 })
    const again = renderHook(() => useView("history"))
    expect(again.result.current).toMatchObject({ layout: "list", size: 3 })
    const other = renderHook(() => useView("library"))
    expect(other.result.current).toMatchObject({ layout: "grid", size: 1 })
  })

  it("settles a size off the scale onto its nearest step before keeping it", () => {
    const { result } = renderHook(() => useView("app"))
    act(() => result.current.setSize(7))
    expect(result.current.size).toBe(3)
    act(() => result.current.setSize(0.4))
    expect(result.current.size).toBe(0)
  })

  it("ignores a stored value that is not a view, and opens on the start", () => {
    for (const stored of [
      "{not json",
      '{"layout":"tiles","size":1}',
      '{"layout":"list","size":9}',
      '{"layout":"list"}',
      "null",
    ]) {
      expect(parseViewChoice(stored), stored).toBeNull()
      window.localStorage.setItem("rosesfield.view.library", stored)
      const { result } = renderHook(() => useView("library"))
      expect(result.current, stored).toMatchObject({ layout: "grid", size: 1 })
      cleanup()
    }
  })

  it("holds the choice for the tab when storage refuses, and opens a place with nothing held on the start", () => {
    const get = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("refused")
      })
    const set = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("refused")
      })
    try {
      const first = renderHook(() => useView("explore"))
      expect(first.result.current).toMatchObject({ layout: "grid", size: 1 })
      act(() => first.result.current.setSize(2))
      expect(first.result.current.size).toBe(2)
      const again = renderHook(() => useView("explore"))
      expect(again.result.current.size).toBe(2)
      const history = renderHook(() => useView("history"))
      expect(history.result.current).toMatchObject({ layout: "grid", size: 1 })
    } finally {
      get.mockRestore()
      set.mockRestore()
    }
  })

  it("hands back the words a place keeps itself, such as a page address", () => {
    const setWords = vi.fn()
    const { result } = renderHook(() =>
      useView("library", { words: "fog", setWords })
    )
    expect(result.current.words).toBe("fog")
    result.current.setWords("rose")
    expect(setWords).toHaveBeenCalledWith("rose")
  })
})
