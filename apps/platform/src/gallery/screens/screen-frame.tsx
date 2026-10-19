import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  useRouter,
} from "@tanstack/react-router"
import { type ReactElement, useState } from "react"
import type { GalleryKey } from "@/gallery/copy.en"
import type { GalleryEntry, GalleryState } from "@/gallery/gallery-entry"
import type { Seed } from "@/gallery/screens/screen-fixtures"

export type StateSpec = {
  id: string
  label: GalleryKey
  path: string
  seeds: readonly Seed[]
  before?: () => void
}

type ScreenFrameProps = {
  path: string
  seeds: readonly Seed[]
  before?: () => void
}

function seededClient(seeds: readonly Seed[]): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: false,
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  })
  for (const seed of seeds) {
    seed(client)
  }
  return client
}

type AppRouter = ReturnType<typeof useRouter>

function screenRouter(
  routeTree: AppRouter["routeTree"],
  path: string,
  client: QueryClient
): AppRouter {
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: client },
  })
}

export function ScreenFrame(props: ScreenFrameProps): ReactElement {
  const outer = useRouter()
  const [frame] = useState(() => {
    props.before?.()
    const client = seededClient(props.seeds)
    return {
      client,
      router: screenRouter(outer.routeTree, props.path, client),
    }
  })
  return (
    <QueryClientProvider client={frame.client}>
      <RouterProvider router={frame.router} />
    </QueryClientProvider>
  )
}

export function screenState(spec: StateSpec): GalleryState {
  return {
    id: spec.id,
    label: spec.label,
    placement: "screen",
    render: () => (
      <ScreenFrame
        path={spec.path}
        seeds={spec.seeds}
        {...(spec.before === undefined ? {} : { before: spec.before })}
      />
    ),
  }
}

export function screenEntry(
  id: string,
  title: GalleryKey,
  states: readonly StateSpec[]
): GalleryEntry {
  return { id: `screen-${id}`, title, states: states.map(screenState) }
}
