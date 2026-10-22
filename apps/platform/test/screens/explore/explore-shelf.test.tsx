import { type Run, run } from "@rosesfield/contract"
import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { t } from "@/copy/t"
import type { ExploreRow } from "@/screens/explore/explore-rows"
import {
  AppsRow,
  appSkeletonCount,
  ExploreRowView,
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

const appEntries: VisualEntry[] = [
  "image",
  "relight",
  "background-removal",
].map((appId, index) => ({
  key: `app-${appId}`,
  run: { ...runOf(`2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5f0${index}`), appId },
  kind: "image",
  aspect: { width: 16, height: 9 },
  source: { kind: "showcase", src: `/m/${appId}.webp` },
}))

describe("Explore's apps row", () => {
  it("holds skeleton tiles while the results load, and nothing once none came", async () => {
    renderAt("/", () => <AppsRow entries={[]} isLoading={true} />)
    const apps = await screen.findByRole("region", {
      name: t("explore.apps.label"),
    })
    expect(apps.querySelectorAll("[data-slot='skeleton-group']")).toHaveLength(
      appSkeletonCount
    )
    cleanup()
    renderAt("/", () => (
      <>
        <span>Explore</span>
        <AppsRow entries={[]} isLoading={false} />
      </>
    ))
    await screen.findByText("Explore")
    expect(
      screen.queryByRole("region", { name: t("explore.apps.label") })
    ).toBeNull()
  })

  it("shows each app once as its media and its name alone, on the kernel row with its circles", async () => {
    renderAt("/", () => <AppsRow entries={appEntries} isLoading={false} />)
    const apps = await screen.findByRole("region", {
      name: t("explore.apps.label"),
    })
    expect(apps.getAttribute("data-layout")).toBe("row")
    const tiles = [...apps.querySelectorAll("[data-slot='explore-app']")]
    expect(tiles.map((tile) => tile.getAttribute("href"))).toEqual([
      "/apps/image",
      "/apps/relight",
      "/apps/background-removal",
    ])
    for (const tile of tiles) {
      expect(tile.querySelectorAll("span:not(:has(*))").length).toBe(1)
      expect(tile.querySelector("img")).not.toBeNull()
    }
    expect(apps.querySelector("[data-slot='media-feed-next']")).not.toBeNull()
    expect(document.querySelector("[data-slot='app-tile-grid']")).toBeNull()
  })
})
