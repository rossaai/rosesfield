import { type Run, run } from "@rosesfield/contract"
import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import type { ExploreRow } from "@/screens/explore/explore-rows"
import { AppsRow, ExploreRowView } from "@/screens/explore/explore-sections"
import type { VisualEntry } from "@/screens/explore/explore-tile"
import { navGroups } from "@/shell/nav-rows"
import { renderAt } from "../../shell/shell-router"

afterEach(cleanup)

function runOf(id: string, appId = "image"): Run {
  return run.parse({
    id,
    appId,
    status: "done",
    inputs: { prompt: "a red rose" },
    count: 1,
    aspectRatio: "1:1",
    seed: 1,
    outputs: [],
    progress: 1,
    engine: {
      adapter: "comfy-workflow",
      models: ["model-a.safetensors"],
      workflowHash: null,
    },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-19T12:00:00.000Z",
    finishedAt: null,
  })
}

const entries: VisualEntry[] = ["01", "02", "03"].map((tail) => ({
  key: `share-${tail}`,
  run: runOf(`2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e${tail}`),
  kind: "image",
  aspect: { width: 1, height: 1 },
  source: { kind: "share", shareId: `share-${tail}`, src: `/s/${tail}.png` },
}))

const row: ExploreRow = {
  kind: "model",
  key: "model-model-a",
  model: "model-a",
  appId: "image",
  entries,
}

function renderRow(): void {
  renderAt("/", () => (
    <ExploreRowView
      row={row}
      onOpen={() => undefined}
      onMore={() => undefined}
    />
  ))
}

describe("Explore's row headers", () => {
  it("carry no Open or Learn more buttons, and end the row with one View all", async () => {
    renderRow()
    const feed = await screen.findByRole("region", { name: "model-a" })
    expect(
      feed.querySelector("[data-slot='section-heading-actions']")
    ).toBeNull()
    expect(
      within(feed).queryByRole("link", {
        name: t("explore.promo.open", { app: "Image" }),
      })
    ).toBeNull()
    const viewAll = within(feed).getAllByRole("link", {
      name: t("explore.viewAll", { name: "model-a" }),
    })
    expect(viewAll).toHaveLength(1)
  })

  it("step the row with a previous and a next circle", async () => {
    renderRow()
    const feed = await screen.findByRole("region", { name: "model-a" })
    expect(
      feed.querySelector("[data-slot='media-feed-previous']")
    ).not.toBeNull()
    expect(feed.querySelector("[data-slot='media-feed-next']")).not.toBeNull()
  })
})

describe("Explore's apps row", () => {
  it("shows every app of the menu as its card with its name and its line, with View all in its header", async () => {
    renderAt("/", () => <AppsRow />)
    const apps = await screen.findByRole("region", {
      name: t("explore.apps.label"),
    })
    expect(apps.getAttribute("data-layout")).toBe("row")
    const cards = [...apps.querySelectorAll("[data-slot='app-card']")]
    const menuApps = navGroups(catalogApps).areas.flatMap((area) => area.apps)
    expect(cards.map((card) => card.getAttribute("href"))).toEqual(
      menuApps.map((app) => `/apps/${app.id}`)
    )
    for (const card of cards) {
      expect(card.querySelector("[data-slot='app-card-line']")).not.toBeNull()
    }
    const actions = apps.querySelector("[data-slot='section-heading-actions']")
    expect(
      [...(actions?.querySelectorAll("a") ?? [])].map(
        (link) => link.textContent
      )
    ).toEqual([t("explore.showcase.viewAll")])
  })
})
