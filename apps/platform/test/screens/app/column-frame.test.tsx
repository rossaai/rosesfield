import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { ColumnFrame } from "@/screens/app/column-frame"
import {
  asPhone,
  resetFrames,
  start,
  stubFetch,
  video,
  withClient,
} from "./frame-render"

beforeEach(stubFetch)

afterEach(() => {
  cleanup()
  resetFrames()
})

describe("the column frame", () => {
  it("puts the mode tabs in the column's tray above the scrolling parts, keeps the column at the reference's 780 px, and runs the canvas to the bottom with a fade at its end", () => {
    render(
      withClient(
        <ColumnFrame
          app={video}
          start={start}
          onShortcut={() => undefined}
          sheet={[false, () => undefined]}
          tabs={<div data-testid="tabs" />}
          panel={<div data-testid="panel" />}
          canvas={() => null}
        />,
        video,
        null
      )
    )
    const tray = document.querySelector("[data-slot='composer-tray']")
    expect(tray?.querySelector("[data-testid='tabs']")).not.toBeNull()
    const parts = document.querySelector("[data-slot='composer-prompt']")
    expect(parts?.querySelector("[data-testid='tabs']")).toBeNull()
    expect(parts?.querySelector("[data-testid='panel']")).not.toBeNull()
    const aside = document.querySelector("aside")
    expect(aside?.className.split(" ")).toContain("@regular:pb-19")
    const rowClasses = aside?.parentElement?.className.split(" ") ?? []
    expect(rowClasses).toContain("pt-2")
    expect(rowClasses.filter((name) => name.includes("pb-"))).toEqual([])
    const scroll = document.querySelector("[data-slot='app-stage-scroll']")
    const scrollClasses = scroll?.className.split(" ") ?? []
    expect(scrollClasses).toContain("pb-s12")
    expect(scrollClasses.some((name) => name.startsWith("[mask-image:"))).toBe(
      true
    )
  })

  it("on a phone puts the canvas at the screen's edges and its runs 16 px in, on the same line as its tabs", () => {
    render(
      withClient(
        <ColumnFrame
          app={video}
          start={start}
          onShortcut={() => undefined}
          sheet={[false, () => undefined]}
          panel={<div />}
          canvas={() => <div data-testid="runs" />}
        />,
        video,
        null
      )
    )
    const row = document.querySelector("[data-slot='column-row']")
    const rowClasses = row?.className.split(" ") ?? []
    expect(rowClasses).toContain("@regular:px-4")
    expect(rowClasses).not.toContain("px-4")
    const scroll = document.querySelector("[data-slot='app-stage-scroll']")
    expect(scroll?.className.split(" ")).toContain("px-4")
    const head = document.querySelector("[data-slot='canvas-head']")
    expect(head?.className.split(" ")).toContain("px-4")
  })
})

describe("the column frame's phone sheet", () => {
  it("leaves 8 px under the mode tabs before the first part, as the desktop column's tray does", () => {
    asPhone()
    render(
      withClient(
        <ColumnFrame
          app={video}
          start={start}
          onShortcut={() => undefined}
          sheet={[true, () => undefined]}
          tabs={<div data-testid="tabs" />}
          panel={<div data-testid="panel" />}
          canvas={() => null}
        />,
        video,
        null
      )
    )
    const body = document.querySelector("[data-slot='sheet-body']")
    const tabs = body?.querySelector("[data-testid='tabs']")
    const tray = tabs?.parentElement
    expect(tray?.getAttribute("data-slot")).toBe("sheet-tray")
    expect(tray?.className.split(" ")).toContain("mb-2")
    expect(tray?.nextElementSibling?.getAttribute("data-testid")).toBe("panel")
  })
})
