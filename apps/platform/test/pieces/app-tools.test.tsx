import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import {
  openAppTools,
  useAppToolsKey,
  useAppToolsOpener,
  useHasAppToolsKey,
} from "@/pieces/app-tools"

afterEach(cleanup)

describe("the app's tools behind the Generate key", () => {
  it("opens the tools of the app on screen, and nothing once it leaves", () => {
    const opened: string[] = []
    const screen = renderHook(() =>
      useAppToolsOpener(() => opened.push("image"))
    )
    expect(openAppTools()).toBe(true)
    expect(opened).toEqual(["image"])
    screen.unmount()
    expect(openAppTools()).toBe(false)
    expect(opened).toEqual(["image"])
  })

  it("calls the opener of the latest render", () => {
    const opened: string[] = []
    const screen = renderHook(
      ({ app }: { app: string }) => useAppToolsOpener(() => opened.push(app)),
      { initialProps: { app: "image" } }
    )
    screen.rerender({ app: "video" })
    openAppTools()
    expect(opened).toEqual(["video"])
  })

  it("opens one sheet, the latest frame's, while two frames are mounted", () => {
    const opened: string[] = []
    const leaving = renderHook(() =>
      useAppToolsOpener(() => opened.push("image"))
    )
    const arriving = renderHook(() =>
      useAppToolsOpener(() => opened.push("video"))
    )
    expect(openAppTools()).toBe(true)
    expect(opened).toEqual(["video"])
    arriving.unmount()
    openAppTools()
    expect(opened).toEqual(["video", "image"])
    leaving.unmount()
  })

  it("knows a Generate key is on screen while one is mounted", () => {
    const seen = renderHook(() => useHasAppToolsKey())
    expect(seen.result.current).toBe(false)
    const key = renderHook(() => useAppToolsKey())
    seen.rerender()
    expect(seen.result.current).toBe(true)
    key.unmount()
    seen.rerender()
    expect(seen.result.current).toBe(false)
  })
})
