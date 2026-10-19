import { createFileRoute } from "@tanstack/react-router"
import {
  type ConnectClient,
  connectClients,
} from "@/screens/connect/connect-code"
import { ConnectScreen } from "@/screens/connect/connect-screen"
import { readOneOf } from "@/shell/search"

type ConnectSearch = {
  client?: ConnectClient
}

export const Route = createFileRoute("/_shell/connect")({
  validateSearch: (search: Record<string, unknown>): ConnectSearch => {
    const client = readOneOf(search.client, connectClients)
    return client === undefined ? {} : { client }
  },
  component: ConnectScreen,
})
