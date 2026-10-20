import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { appLine, takesText } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { AppCard } from "@/screens/apps/app-card"
import { renderAt } from "../../shell/shell-router"

afterEach(cleanup)

async function renderCard(): Promise<HTMLElement> {
  const app = findCatalogApp("video")
  if (app === null) {
    throw new Error("the catalog holds no video app")
  }
  renderAt("/", () => <AppCard app={app} newest={null} working={0} />)
  const card = await screen.findByRole("link", { name: /Video/ })
  expect(card.textContent).toContain(appLine(app))
  expect(card.textContent).not.toContain(takesText(app))
  return card
}

describe("the Apps page card", () => {
  it("is 237 px wide with 16 px padding, and 248 px on a phone's rail", async () => {
    const card = await renderCard()
    expect(card.className.split(" ")).toEqual(
      expect.arrayContaining(["w-62", "@regular:w-59.25", "snap-start"])
    )
    expect(
      card.querySelector("[data-slot='card']")?.className.split(" ")
    ).toContain("p-4")
  })

  it("holds a 203 by 196 frame with a 32 px play circle that rises 8 px on hover", async () => {
    const card = await renderCard()
    const media = card.querySelector("[data-slot='app-card-media'] > span")
    expect(media?.getAttribute("style")).toContain("203 / 196")
    const play = card.querySelector("[data-slot='app-card-play']")
    expect(play?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "size-8",
        "right-2",
        "bottom-2",
        "opacity-0",
        "translate-y-2",
        "group-hover/card:opacity-100",
        "group-hover/card:translate-y-0",
      ])
    )
  })

  it("changes its fill and border on hover instead of laying a light over it, and clamps its line at two", async () => {
    const card = await renderCard()
    expect(card.className).not.toContain("after:")
    expect(
      card.querySelector("[data-slot='card']")?.className.split(" ")
    ).toEqual(
      expect.arrayContaining([
        "border-transparent",
        "group-hover/card:border-(--line)",
        "group-hover/card:bg-(--tint)",
      ])
    )
    expect(card.querySelector("p")?.className.split(" ")).toContain(
      "line-clamp-2"
    )
  })
})
