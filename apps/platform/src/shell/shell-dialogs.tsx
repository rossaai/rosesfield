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
import {
  placeAfter,
  SettingsModal,
  type SettingsPlace,
  type SettingsSection,
} from "@/screens/settings/settings-screen"
import { CreditsDialog } from "@/shell/credits-dialog"

type OpenConnect = (client?: ConnectClient) => void

type OpenSettings = (section?: SettingsSection) => void

const OpenConnectContext = createContext<OpenConnect>(() => undefined)

const OpenCreditsContext = createContext<() => void>(() => undefined)

const OpenSettingsContext = createContext<OpenSettings>(() => undefined)

export function useOpenConnect(): OpenConnect {
  return use(OpenConnectContext)
}

export function useOpenCredits(): () => void {
  return use(OpenCreditsContext)
}

export function useOpenSettings(): OpenSettings {
  return use(OpenSettingsContext)
}

type ConnectState = { open: boolean; client: ConnectClient }

type SettingsState = { open: boolean; place: SettingsPlace }

function useSettingsState(): {
  settings: SettingsState
  openSettings: OpenSettings
  choose: (section: SettingsSection) => void
  setOpen: (open: boolean) => void
} {
  const [settings, setSettings] = useState<SettingsState>({
    open: false,
    place: { section: "engine", arrival: "none" },
  })
  const openSettings = useCallback<OpenSettings>(
    (section) =>
      setSettings((was) => ({
        open: true,
        place: {
          section: section ?? was.place.section,
          arrival: "none",
        },
      })),
    []
  )
  return {
    settings,
    openSettings,
    choose: (section) =>
      setSettings((was) => ({ ...was, place: placeAfter(was.place, section) })),
    setOpen: (open) => setSettings((was) => ({ ...was, open })),
  }
}

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
  const settings = useSettingsState()
  const openConnect = useCallback<OpenConnect>(
    (client) =>
      setConnect((was) => ({ open: true, client: client ?? was.client })),
    []
  )
  const openCredits = useCallback(() => setCreditsOpen(true), [])
  return (
    <OpenConnectContext value={openConnect}>
      <OpenCreditsContext value={openCredits}>
        <OpenSettingsContext value={settings.openSettings}>
          {children}
          <ConnectDialog
            open={connect.open}
            client={connect.client}
            onClient={(client) => setConnect({ open: true, client })}
            onOpenChange={(open) => setConnect((was) => ({ ...was, open }))}
          />
          <CreditsDialog open={isCreditsOpen} onOpenChange={setCreditsOpen} />
          <SettingsModal
            open={settings.settings.open}
            place={settings.settings.place}
            onSection={settings.choose}
            onOpenChange={settings.setOpen}
          />
        </OpenSettingsContext>
      </OpenCreditsContext>
    </OpenConnectContext>
  )
}
