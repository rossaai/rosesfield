import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { BarFrame, type BarPlace } from "@/screens/app/bar-frame"
import {
  asPhone,
  image,
  resetFrames,
  stubFetch,
  withClient,
} from "./frame-render"

beforeEach(stubFetch)

afterEach(() => {
  cleanup()
  resetFrames()
})

describe("the bar frame on a phone", () => {
  it("shows the settings once, in the sheet's body, and the sheet's bar without the chip row", () => {
    asPhone()
    const places: BarPlace[] = []
    render(
      withClient(
        <BarFrame
          app={image}
          hasRuns={false}
          onUseInputs={() => undefined}
          sheet={[true, () => undefined]}
          settings={<div data-testid="settings" />}
          bar={(place) => {
            places.push(place)
            return <div data-testid={`bar-${place}`} />
          }}
        />,
        image,
        []
      )
    )
    expect(screen.getAllByTestId("settings")).toHaveLength(1)
    expect(screen.getByTestId("bar-sheet")).toBeDefined()
    expect(screen.queryByTestId("bar-dock")).toBeNull()
    expect(places.every((place) => place === "sheet")).toBe(true)
  })
})

describe("the bar frame's canvas", () => {
  it("reaches the page's edges, so its head row and its feed share the 16 px gutter at every width", () => {
    render(
      withClient(
        <BarFrame
          app={image}
          hasRuns={false}
          onUseInputs={() => undefined}
          sheet={[false, () => undefined]}
          settings={null}
          bar={() => null}
        />,
        image,
        []
      )
    )
    const stage = document.querySelector('[data-slot="bar-stage"]')
    const feed = document.querySelector('[data-slot="app-stage-scroll"]')
    const classes = (node: Element | null): string[] =>
      node?.className.split(" ") ?? []
    expect(classes(stage).filter((one) => /^(px|pt|pl|pr)-/.test(one))).toEqual(
      []
    )
    expect(classes(feed)).toContain("px-4")
    expect(classes(feed).some((one) => one.includes(":px-"))).toBe(false)
  })
})
