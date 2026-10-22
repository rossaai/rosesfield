import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import { AppStage, AskedTab } from "@/screens/app/app-stage"
import {
  doneRun,
  image,
  resetFrames,
  stubFetch,
  video,
  withClient,
} from "./frame-render"

beforeEach(stubFetch)

afterEach(() => {
  cleanup()
  resetFrames()
})

describe("the app stage's cluster", () => {
  it("holds the one View menu on an app with a column once you have a run", () => {
    render(
      withClient(
        <AppStage app={video} kind="column">
          <div />
        </AppStage>,
        video,
        [doneRun(video.id)]
      )
    )
    const cluster = document.querySelector("[data-slot='canvas-cluster']")
    expect(cluster?.className.split(" ")).not.toContain("invisible")
    const view = cluster?.querySelector("[data-slot='view-menu']")
    expect(view?.textContent).toBe(t("app.canvas.view"))
    expect(
      screen.queryByRole("tab", { name: t("library.view.grid") })
    ).toBeNull()
  })

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

  it("stands the View control in the cluster row", () => {
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
    expect(view?.closest("[data-slot='canvas-cluster']")).not.toBeNull()
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
          <AppStage app={video} kind="column">
            <div />
          </AppStage>
        </AskedTab>,
        video,
        [doneRun(video.id)]
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
        <AppStage app={video} kind="column">
          <div />
        </AppStage>,
        video,
        [doneRun(video.id)]
      )
    )
    expect(
      screen
        .getByRole("tab", { name: t("app.tab.history") })
        .getAttribute("aria-selected")
    ).toBe("true")
  })
})
