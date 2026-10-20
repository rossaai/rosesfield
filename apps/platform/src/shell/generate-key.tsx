import {
  createContext,
  type ReactElement,
  type ReactNode,
  type RefObject,
  use,
  useEffect,
  useRef,
} from "react"

type OpenTools = () => void

const GenerateKeyContext = createContext<RefObject<OpenTools | null>>({
  current: null,
})

export function GenerateKeyProvider({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const tools = useRef<OpenTools | null>(null)
  return <GenerateKeyContext value={tools}>{children}</GenerateKeyContext>
}

export function useGenerateKey(openTools: OpenTools): void {
  const tools = use(GenerateKeyContext)
  useEffect(() => {
    tools.current = openTools
    return () => {
      if (tools.current === openTools) {
        tools.current = null
      }
    }
  }, [tools, openTools])
}

export function useOpenTools(): () => boolean {
  const tools = use(GenerateKeyContext)
  return () => {
    const openTools = tools.current
    if (openTools === null) {
      return false
    }
    openTools()
    return true
  }
}
