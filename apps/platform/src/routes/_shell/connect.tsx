import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { type ReactElement, useEffect } from "react"
import {
  type ConnectClient,
  connectClients,
} from "@/screens/connect/connect-code"
import { ExploreScreen } from "@/screens/explore/explore-screen"
import { readOneOf } from "@/shell/search"
import { useOpenConnect } from "@/shell/shell-dialogs"

type ConnectSearch = {
  client?: ConnectClient
}

function ConnectRoute(): ReactElement {
  const { client } = Route.useSearch()
  const openConnect = useOpenConnect()
  const navigate = useNavigate()
  useEffect(() => {
    openConnect(client)
    void navigate({ to: "/", replace: true })
  }, [client, openConnect, navigate])
  return <ExploreScreen />
}

export const Route = createFileRoute("/_shell/connect")({
  validateSearch: (search: Record<string, unknown>): ConnectSearch => {
    const client = readOneOf(search.client, connectClients)
    return client === undefined ? {} : { client }
  },
  component: ConnectRoute,
})
