import { findApp } from "@rosesfield/catalog"
import { appListing } from "@rosesfield/contract"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import type { ReactElement } from "react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { RunColumns } from "@/pieces/run/run-card"
import { AppStage, AskedTab } from "@/screens/app/app-stage"
import { useCanvasView } from "@/screens/app/canvas-view"
import {
  asPhone,
  doneRun,
  image,
  resetFrames,
  stubFetch,
  video,
  withClient,
} from "./frame-render"

const motion = appListing.parse(findApp("motion"))

beforeEach(stubFetch)

afterEach(() => {
  cleanup()
  resetFrames()
  window.localStorage.clear()
})

function RunFeed(): ReactElement {
  const view = useCanvasView()
  return (
    <RunColumns columns={view.columns}>
      {["a", "b", "c", "d"].map((name) => (
        <span key={name}>{name}</span>
      ))}
    </RunColumns>
  )
}

function columnsShown(): string | undefined {
  return document
    .querySelector<HTMLElement>("[data-slot='run-columns']")
    ?.style.getPropertyValue("--run-columns")
}

describe("the app stage's header", () => {
  it.each([
    ["an app with a column", video, "column" as const],
    ["a prompt app", image, "bar" as const],
  ])(
    "holds History and How it works, then one View menu and no filter, on %s",
    (_, app, kind) => {
      render(
        withClient(
          <AppStage app={app} kind={kind}>
            <div />
          </AppStage>,
          app,
          [doneRun(app.id)]
        )
      )
      const head = document.querySelector("[data-slot='canvas-head']")
      const tabs = head?.querySelector("[data-slot='tabs-list']")
      expect(
        [...(tabs?.querySelectorAll("[data-slot='tabs-trigger']") ?? [])].map(
          (tab) => tab.textContent
        )
      ).toEqual([t("app.tab.history"), t("app.tab.how")])
      const cluster = document.querySelector("[data-slot='canvas-cluster']")
      expect(cluster?.className.split(" ")).not.toContain("invisible")
      expect(cluster?.querySelectorAll("[data-slot='view-menu']")).toHaveLength(
        1
      )
      expect(head?.querySelector("input[type='range']")).toBeNull()
      expect(
        screen.queryByRole("button", { name: t("library.filter") })
      ).toBeNull()
    }
  )

  it("holds one View control with a grid glyph on a prompt app", () => {
    render(
      withClient(
        <AppStage app={image} kind="bar">
          <div />
        </AppStage>,
        image,
        [doneRun(image.id)]
      )
    )
    const view = document.querySelector("[data-slot='view-menu']")
    expect(view?.textContent).toBe(t("app.canvas.view"))
    expect(view?.querySelector(".lucide-layout-grid")).not.toBeNull()
    expect(view?.className.split(" ")).toContain("rounded-full")
    expect(view?.className.split(" ")).not.toContain("border")
  })

  it("sets the run feed's column count from the View size, two at rest and three at the smallest step", async () => {
    render(
      withClient(
        <AppStage app={image} kind="bar">
          <RunFeed />
        </AppStage>,
        image,
        [doneRun(image.id)]
      )
    )
    expect(columnsShown()).toBe("repeat(2, minmax(0, 1fr))")
    fireEvent.click(screen.getByRole("button", { name: t("app.canvas.view") }))
    await screen.findByRole("menuitemradio", { name: t("library.view.list") })
    const slider = document.querySelector<HTMLInputElement>(
      "[data-slot='view-menu-size'] input[type='range']"
    )
    expect(slider).not.toBeNull()
    fireEvent.keyDown(slider ?? document.body, { key: "ArrowRight" })
    await waitFor(() =>
      expect(columnsShown()).toBe("repeat(1, minmax(0, 1fr))")
    )
    fireEvent.keyDown(slider ?? document.body, { key: "Home" })
    await waitFor(() =>
      expect(columnsShown()).toBe("repeat(3, minmax(0, 1fr))")
    )
  })

  it("keeps one column and puts View in the tabs row on a phone", () => {
    asPhone()
    render(
      withClient(
        <AppStage app={image} kind="bar">
          <RunFeed />
        </AppStage>,
        image,
        [doneRun(image.id)]
      )
    )
    expect(columnsShown()).toBe("repeat(1, minmax(0, 1fr))")
    const row = document.querySelector("[data-slot='app-stage-tabs']")
    expect(row?.querySelector("[data-slot='view-menu']")).not.toBeNull()
    expect(
      document.querySelector(
        "[data-slot='canvas-cluster'] [data-slot='view-menu']"
      )
    ).toBeNull()
  })

  it("leaves the ring room above the stage's first row, so a first tile's focus ring shows whole", () => {
    render(
      withClient(
        <AppStage app={image} kind="bar">
          <div />
        </AppStage>,
        image,
        [doneRun(image.id)]
      )
    )
    const scroll = document.querySelector("[data-slot='app-stage-scroll']")
    expect(scroll?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "-mt-[calc(var(--spacing-focus-ring)*2)]",
        "pt-[calc(var(--spacing-focus-ring)*2)]",
      ])
    )
  })

  it("opens on the tab the link asks for, even once you have a run", () => {
    render(
      withClient(
        <AskedTab tab="how">
          <AppStage app={motion} kind="column">
            <div />
          </AppStage>
        </AskedTab>,
        motion,
        [doneRun(motion.id)]
      )
    )
    expect(
      screen
        .getByRole("tab", { name: t("app.tab.how") })
        .getAttribute("aria-selected")
    ).toBe("true")
    cleanup()
    render(
      withClient(
        <AppStage app={motion} kind="column">
          <div />
        </AppStage>,
        motion,
        [doneRun(motion.id)]
      )
    )
    expect(
      screen
        .getByRole("tab", { name: t("app.tab.history") })
        .getAttribute("aria-selected")
    ).toBe("true")
  })
})
