import { exampleKeyOf } from "@rosesfield/catalog/motion"
import { type AppListing, appListing } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { type AppExample, examplesOf } from "@/catalog/app-examples"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { tCatalog } from "@/copy/t"
import demoVideo from "@/gallery/fixtures/demo-video-16-9.mp4"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { AppLibrary } from "@/screens/app/app-library"

const app = appListing.parse(findCatalogApp("motion"))

const influencer = appListing.parse(findCatalogApp("ai-influencer"))

function exampleOf(id: string): AppExample {
  const key = exampleKeyOf(id)
  return {
    id,
    name: tCatalog(`motion.example.${key}.name`),
    line: tCatalog(`motion.example.${key}.photo`),
    src: demoVideo,
    kind: "video",
    aspect: { width: 16, height: 9 },
    draft: { prompt: "", assetIds: [], characterIds: [] },
  }
}

const shown: readonly AppExample[] = [
  exampleOf("grab-and-run"),
  exampleOf("push-into-eye"),
  exampleOf("ticket-wipe"),
]

function Library({
  width,
  of = app,
  examples = shown,
}: {
  width: number
  of?: AppListing
  examples?: readonly AppExample[]
}): ReactElement {
  return (
    <div style={{ width }} className="max-w-full bg-canvas p-s4">
      <AppLibrary app={of} examples={examples} />
    </div>
  )
}

export const appLibraryEntry: GalleryEntry = {
  id: "app-library",
  title: "entry.appLibrary",
  states: [
    {
      id: "examples",
      label: "state.libraryExamples",
      width: "full",
      render: () => <Library width={760} />,
    },
    {
      id: "phone",
      label: "state.libraryPhone",
      width: "full",
      render: () => <Library width={358} />,
    },
    {
      id: "stills",
      label: "state.libraryStills",
      width: "full",
      render: () => (
        <Library
          width={760}
          of={influencer}
          examples={examplesOf(influencer.id)}
        />
      ),
    },
  ],
}
