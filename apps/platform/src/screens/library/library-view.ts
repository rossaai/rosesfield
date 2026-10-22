import type { ViewLayout } from "@/screens/library/view-cluster"

export type LibraryShown = "masonry" | "rows" | "tiles"

export const libraryLayout: ViewLayout = "grid"

export function libraryShownOf(
  layout: ViewLayout,
  selected: readonly string[] | null
): LibraryShown {
  if (selected !== null) {
    return "tiles"
  }
  return layout === "grid" ? "masonry" : "rows"
}
