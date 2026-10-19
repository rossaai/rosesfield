import { createFileRoute } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { ShareScreen } from "@/screens/explore/share-screen"

function ShareRoute(): ReactElement {
  const { shareId } = Route.useParams()
  return <ShareScreen shareId={shareId} />
}

export const Route = createFileRoute("/share/$shareId")({
  component: ShareRoute,
})
