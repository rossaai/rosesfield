import { type Run, run } from "@rosesfield/contract"
import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import type { ExploreRow } from "@/screens/explore/explore-rows"
import {
  AppTiles,
  ExploreRowView,
  PromoCards,
  promoSkeletonCount,
  tileApps,
} from "@/screens/explore/explore-sections"
import type { VisualEntry } from "@/screens/explore/explore-tile"
import { renderAt } from "../../shell/shell-router"

afterEach(cleanup)

function runOf(id: string): Run {
  return run.parse({
    id,
    appId: "image",
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

function renderRow(isLead: boolean): void {
  renderAt("/", () => (
    <ExploreRowView
      row={row}
      isLead={isLead}
      onOpen={() => undefined}
      onMore={() => undefined}
    />
  ))
}

describe("Explore's row headers", () => {
  it("carry two buttons on the lead row, the app first, then Recreate", async () => {
    renderRow(true)
    const header = (
      await screen.findByRole("region", { name: "model-a" })
    ).querySelector("[data-slot='section-heading-actions']")
    expect(header).not.toBeNull()
    const links = within(header as HTMLElement).getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual([
      t("explore.promo.open", { app: "Image" }),
      t("explore.tile.recreate"),
    ])
    expect(links[0]?.getAttribute("href")).toBe("/apps/image")
    expect(links[1]?.getAttribute("href")).toContain("share=share-01")
    expect(links[0]?.className.split(" ")).toContain("h-12")
  })

  it("leave every other row with its title and line alone", async () => {
    renderRow(false)
    const feed = await screen.findByRole("region", { name: "model-a" })
    expect(
      feed.querySelector("[data-slot='section-heading-actions']")
    ).toBeNull()
  })
})

describe("Explore's promo row", () => {
  it("holds skeleton cards while the results load, and nothing once none came", async () => {
    renderAt("/", () => <PromoCards entries={[]} isLoading={true} />)
    const promo = await screen.findByRole("region", {
      name: t("explore.promo.label"),
    })
    expect(promo.querySelectorAll("[data-slot='skeleton']")).toHaveLength(
      promoSkeletonCount * 2
    )
    cleanup()
    renderAt("/", () => (
      <>
        <span>Explore</span>
        <PromoCards entries={[]} isLoading={false} />
      </>
    ))
    await screen.findByText("Explore")
    expect(
      screen.queryByRole("region", { name: t("explore.promo.label") })
    ).toBeNull()
  })
})

describe("Explore's app tiles", () => {
  it("carry the Video pill on each tool that makes video, and on no other", async () => {
    renderAt("/", () => <AppTiles />)
    await screen.findByRole("navigation", { name: t("explore.apps.label") })
    for (const { app } of tileApps(catalogApps)) {
      const tile = document.querySelector(`a[href='/apps/${app.id}']`)
      const pill = tile?.querySelector("[data-slot='app-tile-mode']")
      if (app.output.kind === "video") {
        expect(pill?.textContent).toBe(t("kind.video"))
      } else {
        expect(pill).toBeNull()
      }
    }
  })
})
