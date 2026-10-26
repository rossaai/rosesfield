import { findApp } from "@rosesfield/catalog"
import { type AppListing, appListing } from "@rosesfield/contract"
import { cleanup, render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { appName } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { BarFrame } from "@/screens/app/bar-frame"
import { ColumnFrame } from "@/screens/app/column-frame"
import { PhoneTitleProvider, usePhoneTitleSlot } from "@/shell/screen-header"
import {
  asPhone,
  resetFrames,
  start,
  stubFetch,
  video,
  withClient,
} from "./frame-render"

const ads = appListing.parse(findApp("ads"))

beforeEach(stubFetch)

afterEach(() => {
  cleanup()
  resetFrames()
})

function TitleSlot(): ReactElement | null {
  const slot = usePhoneTitleSlot()
  return slot.titles > 0 ? (
    <span ref={slot.setNode} data-testid="phone-slot" />
  ) : null
}

function barFrame(app: AppListing): ReactElement {
  return (
    <BarFrame
      app={app}
      onUseInputs={() => undefined}
      sheet={[false, () => undefined]}
      settings={null}
      bar={() => null}
    />
  )
}

function columnFrame(hasHeader?: boolean): ReactElement {
  return (
    <ColumnFrame
      app={video}
      start={start}
      onShortcut={() => undefined}
      sheet={[false, () => undefined]}
      panel={null}
      canvas={() => null}
      {...(hasHeader === undefined ? {} : { hasHeader })}
    />
  )
}

describe("the app stage's title", () => {
  it.each([
    ["a bar app", () => barFrame(ads), appName(ads)],
    ["a column app", () => columnFrame(), appName(video)],
  ])(
    "shows the app's own name as the page's one h1, at the display size, before History in the stage's row, on %s",
    (_, frame, name) => {
      render(withClient(frame(), video, null))
      const headings = screen.getAllByRole("heading", { level: 1 })
      expect(headings.map((heading) => heading.textContent)).toEqual([name])
      const [title] = headings
      expect(title?.className.split(" ")).toEqual(
        expect.arrayContaining(["text-display", "text-ink"])
      )
      expect(title?.className.split(" ")).not.toContain("sr-only")
      const row = document.querySelector("[data-slot='app-stage-tabs']")
      const history = screen.getByRole("tab", { name: t("app.tab.history") })
      expect(row?.contains(title ?? null)).toBe(true)
      expect(
        title?.compareDocumentPosition(history) ??
          Node.DOCUMENT_POSITION_PRECEDING
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    }
  )

  it("puts the name in the phone's title slot on a phone, and leaves none in the stage's row", async () => {
    asPhone()
    render(
      withClient(
        <PhoneTitleProvider>
          <TitleSlot />
          {barFrame(ads)}
        </PhoneTitleProvider>,
        ads,
        null
      )
    )
    const slot = await screen.findByTestId("phone-slot")
    expect(slot.querySelector("h1")?.textContent).toBe(appName(ads))
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    const row = document.querySelector("[data-slot='app-stage-tabs']")
    expect(row?.querySelector("h1")).toBeNull()
  })

  it("shows no title when the frame sits under a screen that has its own", () => {
    render(withClient(columnFrame(false), video, null))
    expect(screen.queryAllByRole("heading", { level: 1 })).toEqual([])
  })
})
