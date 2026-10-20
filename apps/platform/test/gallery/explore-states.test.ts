import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import { runsOf } from "@/api/queries"
import { exploreStates } from "@/gallery/screens/explore-entries"
import {
  admittedEntries,
  ownEntries,
  sharedEntries,
} from "@/screens/explore/explore-entries"
import {
  type ExploreAdmission,
  exploreListQuery,
} from "@/screens/explore/explore-list"
import { publishedQuery, type SharedOutput } from "@/screens/explore/share-api"

function shownIn(id: string): number {
  const spec = exploreStates.find((one) => one.id === id)
  if (spec === undefined) {
    throw new Error(`no explore state ${id}`)
  }
  const client = new QueryClient()
  for (const seed of spec.seeds) {
    seed(client)
  }
  const list =
    client.getQueryData<readonly ExploreAdmission[]>(
      exploreListQuery.queryKey
    ) ?? []
  const shares =
    client.getQueryData<readonly SharedOutput[]>(publishedQuery.queryKey) ?? []
  const runs = runsOf(
    client.getQueryData<Parameters<typeof runsOf>[0]>(["runs", { appId: null }])
  )
  return admittedEntries([...sharedEntries(shares), ...ownEntries(runs)], list)
    .length
}

describe("the gallery's Explore states", () => {
  it.each(["done", "rail", "cap"])(
    "seed an Explore list, so the %s state shows results",
    (id) => {
      expect(shownIn(id)).toBeGreaterThan(0)
    }
  )

  it("shows nothing in the empty state", () => {
    expect(shownIn("empty")).toBe(0)
  })
})
