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
  it("puts the mode tabs in the column's tray above the scrolling parts, runs the column to 16 px from the window's foot, and runs the canvas to the bottom with a fade at its end", () => {
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
    expect(aside?.className.split(" ")).toContain("@regular:pb-4")
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

describe("the column frame's stage with work in hand", () => {
  it("shows the canvas, not How it works, when the screen opens with work and the app has no runs", () => {
    render(
      withClient(
        <ColumnFrame
          app={video}
          start={start}
          onShortcut={() => undefined}
          sheet={[false, () => undefined]}
          panel={<div />}
          hasWork
          canvas={() => <div data-testid="opened" />}
        />,
        video,
        []
      )
    )
    expect(document.querySelector("[data-testid='opened']")).not.toBeNull()
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

  it("on a phone holds the start button at the bottom edge, outside the sheet, while a step waits for your yes, and the key that opens the inputs otherwise, the control", () => {
    asPhone()
    const frame = (holdsPress: boolean) => (
      <ColumnFrame
        app={video}
        start={{ ...start, label: "Make final" }}
        onShortcut={() => undefined}
        sheet={[false, () => undefined]}
        panel={<div data-testid="panel" />}
        canvas={() => null}
        holdsPress={holdsPress}
      />
    )
    const { unmount } = render(withClient(frame(true), video, null))
    const press = document.querySelector("[data-slot='app-press-key']")
    expect(press?.className.split(" ")).toEqual(
      expect.arrayContaining(["sticky", "bottom-0"])
    )
    expect(press?.textContent).toContain("Make final")
    expect(document.querySelector("[data-slot='app-tools-key']")).toBeNull()
    expect(document.querySelector("[data-testid='panel']")).toBeNull()
    unmount()
    render(withClient(frame(false), video, null))
    expect(document.querySelector("[data-slot='app-press-key']")).toBeNull()
    expect(document.querySelector("[data-slot='app-tools-key']")).not.toBeNull()
  })
})
