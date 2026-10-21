import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { ColumnFrame } from "@/screens/app/column-frame"
import {
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
  it("puts the mode tabs in the column's tray above the scrolling parts, and keeps the reference's 120 px of vertical margin", () => {
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
    const row = document.querySelector("aside")?.parentElement
    expect(row?.className.split(" ")).toEqual(
      expect.arrayContaining(["pt-2", "@regular:pb-19"])
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
