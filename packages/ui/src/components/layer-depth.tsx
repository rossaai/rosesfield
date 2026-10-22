import { createContext, type ReactElement, type ReactNode, use } from "react"

const InLayer = createContext(false)

const nestedLayerClass =
  "bg-(--layer)! shadow-float backdrop-filter-none! [--layer-tint:var(--surface)] [--layer:var(--canvas)] dark:[--layer-line:var(--surface-2)] dark:[--layer-tint:var(--canvas)] dark:[--layer:var(--surface)]"

function LayerDepth({ children }: { children: ReactNode }): ReactElement {
  return <InLayer value={true}>{children}</InLayer>
}

function useIsInLayer(): boolean {
  return use(InLayer)
}

export { LayerDepth, nestedLayerClass, useIsInLayer }
