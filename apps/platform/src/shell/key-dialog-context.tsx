import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useState,
} from "react"
import { KeyDialog } from "@/screens/settings/key-dialog"

const OpenKeyDialog = createContext<() => void>(() => undefined)

export function useOpenKeyDialog(): () => void {
  return use(OpenKeyDialog)
}

export function KeyDialogProvider({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const [isOpen, setOpen] = useState(false)
  return (
    <OpenKeyDialog value={() => setOpen(true)}>
      {children}
      <KeyDialog open={isOpen} onOpenChange={setOpen} />
    </OpenKeyDialog>
  )
}
