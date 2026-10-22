import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useState,
} from "react"
import type { ConnectClient } from "@/screens/connect/connect-code"
import { ConnectDialog } from "@/screens/connect/connect-dialog"
import { CreditsDialog } from "@/shell/credits-dialog"

type OpenConnect = (client?: ConnectClient) => void

const OpenConnectContext = createContext<OpenConnect>(() => undefined)

const OpenCreditsContext = createContext<() => void>(() => undefined)

export function useOpenConnect(): OpenConnect {
  return use(OpenConnectContext)
}

export function useOpenCredits(): () => void {
  return use(OpenCreditsContext)
}

type ConnectState = { open: boolean; client: ConnectClient }

export function ShellDialogsProvider({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const [connect, setConnect] = useState<ConnectState>({
    open: false,
    client: "claude",
  })
  const [isCreditsOpen, setCreditsOpen] = useState(false)
  const openConnect = useCallback<OpenConnect>(
    (client) =>
      setConnect((was) => ({ open: true, client: client ?? was.client })),
    []
  )
  const openCredits = useCallback(() => setCreditsOpen(true), [])
  return (
    <OpenConnectContext value={openConnect}>
      <OpenCreditsContext value={openCredits}>
        {children}
        <ConnectDialog
          open={connect.open}
          client={connect.client}
          onClient={(client) => setConnect({ open: true, client })}
          onOpenChange={(open) => setConnect((was) => ({ ...was, open }))}
        />
        <CreditsDialog open={isCreditsOpen} onOpenChange={setCreditsOpen} />
      </OpenCreditsContext>
    </OpenConnectContext>
  )
}
