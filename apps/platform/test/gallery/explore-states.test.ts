import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"
import { exploreStates } from "@/gallery/screens/explore-entries"
import {
  admittedEntries,
  exploreShares,
  sharedEntries,
} from "@/screens/explore/explore-entries"
import {
  type ExploreAdmission,
  exploreListQuery,
} from "@/screens/explore/explore-list"
import { type SharedOutput, shareQuery } from "@/screens/explore/share-api"

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
  const shares = exploreShares(list).flatMap(
    (shareId) =>
      client.getQueryData<SharedOutput>(shareQuery(shareId).queryKey) ?? []
  )
  return admittedEntries(sharedEntries(shares), list).length
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
