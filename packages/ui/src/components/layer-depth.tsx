import { createContext, type ReactElement, type ReactNode, use } from "react"

const InLayer = createContext(false)

const nestedLayerClass =
  "dark:[--layer:var(--surface)] dark:[--layer-line:var(--surface-2)] dark:[--layer-tint:var(--canvas)] dark:bg-(--layer)! dark:backdrop-filter-none!"

function LayerDepth({ children }: { children: ReactNode }): ReactElement {
  return <InLayer value={true}>{children}</InLayer>
}

function useIsInLayer(): boolean {
  return use(InLayer)
}

export { LayerDepth, nestedLayerClass, useIsInLayer }
