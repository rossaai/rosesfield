import { afterEach, describe, expect, it } from "vitest"
import { inAppPathOf, type LinkClick } from "@/screens/explore/in-app-links"

const origin = "http://localhost:3000"

function linkTo(href: string, change: (anchor: HTMLAnchorElement) => void) {
  const anchor = document.createElement("a")
  anchor.href = href
  change(anchor)
  const label = document.createElement("span")
  anchor.append(label)
  document.body.append(anchor)
  return label
}

function clickOn(
  target: EventTarget | null,
  change: Partial<LinkClick> = {}
): LinkClick {
  return {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    target,
    ...change,
  }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe("a link inside Explore", () => {
  it("opens in the app when it points inside it", () => {
    const label = linkTo(`${origin}/apps/video?from=abc#top`, () => undefined)

    expect(inAppPathOf(clickOn(label), origin)).toBe("/apps/video?from=abc#top")
  })

  it("is left to the browser when it leaves the app or opens elsewhere", () => {
    const away = linkTo("https://example.com/apps", () => undefined)
    const tab = linkTo(`${origin}/apps`, (anchor) => {
      anchor.target = "_blank"
    })
    const file = linkTo(`${origin}/apps`, (anchor) => {
      anchor.setAttribute("download", "")
    })

    expect(inAppPathOf(clickOn(away), origin)).toBeNull()
    expect(inAppPathOf(clickOn(tab), origin)).toBeNull()
    expect(inAppPathOf(clickOn(file), origin)).toBeNull()
  })

  it("is left alone on a modified click or one already handled", () => {
    const label = linkTo(`${origin}/apps`, () => undefined)

    expect(inAppPathOf(clickOn(label, { metaKey: true }), origin)).toBeNull()
    expect(inAppPathOf(clickOn(label, { button: 1 }), origin)).toBeNull()
    expect(
      inAppPathOf(clickOn(label, { defaultPrevented: true }), origin)
    ).toBeNull()
    expect(inAppPathOf(clickOn(document.body), origin)).toBeNull()
  })
})
