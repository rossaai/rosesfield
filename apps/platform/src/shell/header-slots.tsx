import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useState,
} from "react"

export type HeaderSlots = {
  title: HTMLElement | null
  action: HTMLElement | null
}

const HeaderSlotsContext = createContext<HeaderSlots>({
  title: null,
  action: null,
})

export function useHeaderSlots(): HeaderSlots {
  return use(HeaderSlotsContext)
}

type HeaderSlotTargets = {
  slots: HeaderSlots
  titleTarget: ReactElement
  actionTarget: ReactElement
}

export function useHeaderSlotTargets(): HeaderSlotTargets {
  const [title, setTitle] = useState<HTMLElement | null>(null)
  const [action, setAction] = useState<HTMLElement | null>(null)
  return {
    slots: { title, action },
    titleTarget: <span ref={setTitle} className="contents" />,
    actionTarget: <span ref={setAction} className="contents" />,
  }
}

export function HeaderSlotsProvider({
  slots,
  children,
}: {
  slots: HeaderSlots
  children: ReactNode
}): ReactElement {
  return <HeaderSlotsContext value={slots}>{children}</HeaderSlotsContext>
}
