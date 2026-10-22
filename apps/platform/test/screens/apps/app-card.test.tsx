import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { appLine, takesText } from "@/catalog/app-facts"
import { catalogApps, findCatalogApp } from "@/catalog/catalog-apps"
import { AppCard } from "@/screens/apps/app-card"
import { showcaseOf } from "@/showcase/showcase"
import { renderAt } from "../../shell/shell-router"

afterEach(cleanup)

async function renderCard(): Promise<HTMLElement> {
  const app = findCatalogApp("image")
  if (app === null) {
    throw new Error("the catalog holds no image app")
  }
  renderAt("/", () => <AppCard app={app} newest={null} working={0} />)
  const card = await screen.findByRole("link", { name: /Image/ })
  expect(card.textContent).toContain(appLine(app))
  expect(card.textContent).not.toContain(takesText(app))
  return card
}

async function mediaOfCard(appId: string): Promise<Element | null> {
  const app = findCatalogApp(appId)
  if (app === null) {
    throw new Error(`the catalog holds no ${appId} app`)
  }
  renderAt("/", () => <AppCard app={app} newest={null} working={0} />)
  const card = await screen.findByRole("link")
  return card.querySelector(
    "[data-slot='app-card-media'] img, [data-slot='app-card-media'] video"
  )
}

describe("the Apps page card's media", () => {
  it("shows a bundled still or clip of what the app makes", async () => {
    const still = await mediaOfCard("image")
    expect(still?.getAttribute("src")).toBe(showcaseOf("image")[0]?.src)
    cleanup()
    const clip = await mediaOfCard("effects")
    expect(clip?.tagName).toBe("VIDEO")
    expect(clip?.getAttribute("src")).toBe(showcaseOf("effects")[0]?.src)
  })

  it("draws an app with no example as what it takes and what it makes, with no invented picture", async () => {
    expect(showcaseOf("lipsync")).toEqual([])
    expect(await mediaOfCard("lipsync")).toBeNull()
    const card = await screen.findByRole("link")
    expect(card.getAttribute("data-app-card")).toBe("compact")
    const flow = card.querySelector("[data-slot='app-card-flow']")
    const kinds = (made: string) =>
      [...(flow?.querySelectorAll(`[data-made='${made}']`) ?? [])].map(
        (disc) => disc.getAttribute("data-kind")
      )
    expect(kinds("no")).toEqual(expect.arrayContaining(["image", "audio"]))
    expect(kinds("yes")).toEqual(["video"])
    expect(card.querySelector("[data-slot='app-card-play']")).toBeNull()
  })

  it("draws every catalog app as one card with the same 203 by 196 frame, held media or its flow", async () => {
    for (const app of catalogApps) {
      renderAt("/", () => <AppCard app={app} newest={null} working={0} />)
      const card = await screen.findByRole("link")
      const slot = card.querySelector("[data-slot='app-card-media']")
      expect(slot, app.id).not.toBeNull()
      const media = slot?.querySelector("img, video")
      const flow = slot?.querySelector("[data-slot='app-card-flow']")
      expect(media === null ? flow : media, app.id).not.toBeNull()
      expect(
        slot?.querySelector("[style]")?.getAttribute("style"),
        app.id
      ).toContain("203 / 196")
      cleanup()
    }
  })
})

describe("the Apps page card", () => {
  it("takes its grid's width with 16 px padding, and 248 px on a phone's rail", async () => {
    const card = await renderCard()
    expect(card.className.split(" ")).toEqual(
      expect.arrayContaining(["w-62", "@regular:w-auto", "snap-start"])
    )
    expect(
      card.querySelector("[data-slot='card']")?.className.split(" ")
    ).toContain("p-4")
  })

  it("holds a 203 by 196 frame with a 32 px play circle that shows on hover on the tint preset", async () => {
    const card = await renderCard()
    const media = card.querySelector("[data-slot='app-card-media'] [style]")
    expect(media?.getAttribute("style")).toContain("203 / 196")
    const play = card.querySelector("[data-slot='app-card-play']")
    expect(play?.className.split(" ")).toEqual(
      expect.arrayContaining([
        "size-8",
        "right-2",
        "bottom-2",
        "opacity-0",
        "motion-tint",
        "group-hover/card:opacity-100",
      ])
    )
    expect(play?.className).not.toMatch(/transition|duration-/)
  })

  it("tints its fill on hover with no border, and keeps its line to one", async () => {
    const card = await renderCard()
    expect(card.className).not.toContain("after:")
    const fill = card.querySelector("[data-slot='card']")?.className ?? ""
    expect(fill.split(" ")).toEqual(
      expect.arrayContaining(["motion-tint", "group-hover/card:bg-(--tint)"])
    )
    expect(fill).not.toMatch(/border/)
    expect(card.querySelector("p")?.className.split(" ")).toContain(
      "truncate"
    )
  })
})
