import type { Run } from "@rosesfield/contract"
import type { QueryClient } from "@tanstack/react-query"

export type RouterContext = {
  queryClient: QueryClient
}

export type Draft = {
  prompt: string
  assetIds: string[]
  characterIds: string[]
  inputs?: Run["inputs"]
  aspectRatio?: string | null
  input?: { src: string; name: string }
}

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: TanStack Router reads history state through declaration merging, which only an interface allows
  interface HistoryState {
    draft?: Draft
  }
}
