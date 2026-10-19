import type { QueryClient } from "@tanstack/react-query"
import { createRouter } from "@tanstack/react-router"
import { routeTree } from "@/route-tree.gen"

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })
}

export type AppRouter = ReturnType<typeof createAppRouter>

declare module "@tanstack/react-router" {
  // biome-ignore lint/style/useConsistentTypeDefinitions: TanStack Router reads the router type through declaration merging, which only an interface allows
  interface Register {
    router: AppRouter
  }
}
