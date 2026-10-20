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
  it("holds the size slider, List and Grid and Filter on an app with a column once you have a run", () => {
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
    expect(cluster?.querySelector("[data-slot='view-pill']")).not.toBeNull()
    expect(
      screen.getByRole("tab", { name: t("library.view.grid") })
    ).toBeDefined()
    expect(
      screen.getByRole("button", { name: t("library.filter") })
    ).toBeDefined()
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
    const view = document.querySelector("[data-slot='canvas-view']")
    expect(view?.textContent).toBe(t("app.canvas.view"))
    expect(view?.querySelector(".lucide-layout-grid")).not.toBeNull()
    expect(view?.className.split(" ")).toEqual(
      expect.arrayContaining(["h-8", "rounded-dense", "border"])
    )
    expect(document.querySelector("[data-slot='view-pill']")).toBeNull()
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
