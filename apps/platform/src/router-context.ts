import type { QueryClient } from "@tanstack/react-query"

export type RouterContext = {
  queryClient: QueryClient
}

export type Draft = {
  prompt: string
  assetIds: string[]
  characterIds: string[]
}

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: TanStack Router reads history state through declaration merging, which only an interface allows
  interface HistoryState {
    draft?: Draft
  }
}
