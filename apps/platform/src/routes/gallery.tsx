import { createFileRoute } from "@tanstack/react-router"
import { lazy, type ReactElement, Suspense } from "react"
import { ShellNotFound } from "@/screens/not-found-screen"

const GalleryScreen = import.meta.env.DEV
  ? lazy(async () => {
      const gallery = await import("@/gallery/gallery-page")
      return {
        default: (): ReactElement => (
          <gallery.GalleryPage
            {...gallery.readGallerySearch(window.location.search)}
          />
        ),
      }
    })
  : null

function GalleryRoute(): ReactElement {
  if (GalleryScreen === null) {
    return <ShellNotFound />
  }
  return (
    <Suspense fallback={null}>
      <GalleryScreen />
    </Suspense>
  )
}

export const Route = createFileRoute("/gallery")({
  component: GalleryRoute,
})
