import { useRouter } from "@tanstack/react-router"
import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useMemo,
  useState,
} from "react"

type ViewerTrail = {
  origin: HTMLElement | null
  list: readonly string[]
  isPushed: boolean
}

type ViewerApi = {
  trail: ViewerTrail
  open: (
    assetId: string,
    origin: HTMLElement | null,
    list: readonly string[]
  ) => void
  step: (assetId: string) => void
  close: () => void
}

const emptyTrail: ViewerTrail = { origin: null, list: [], isPushed: false }

const ViewerContext = createContext<ViewerApi>({
  trail: emptyTrail,
  open: () => undefined,
  step: () => undefined,
  close: () => undefined,
})

function urlWithView(assetId: string | null): string {
  const url = new URL(window.location.href)
  if (assetId === null) {
    url.searchParams.delete("view")
  } else {
    url.searchParams.set("view", assetId)
  }
  return `${url.pathname}${url.search}${url.hash}`
}

export function ViewerProvider({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const router = useRouter()
  const [trail, setTrail] = useState<ViewerTrail>(emptyTrail)
  const open = useCallback(
    (assetId: string, origin: HTMLElement | null, list: readonly string[]) => {
      setTrail({ origin, list, isPushed: true })
      router.history.push(urlWithView(assetId))
    },
    [router]
  )
  const step = useCallback(
    (assetId: string) => {
      setTrail((current) => ({ ...current, origin: null }))
      router.history.replace(urlWithView(assetId))
    },
    [router]
  )
  const close = useCallback(() => {
    if (trail.isPushed) {
      setTrail((current) => ({ ...current, isPushed: false }))
      router.history.back()
      return
    }
    router.history.replace(urlWithView(null))
  }, [router, trail.isPushed])
  const api = useMemo(
    () => ({ trail, open, step, close }),
    [trail, open, step, close]
  )
  return <ViewerContext value={api}>{children}</ViewerContext>
}

export function useViewer(): ViewerApi {
  return use(ViewerContext)
}
