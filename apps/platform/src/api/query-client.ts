import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"

type QueryClientOptions = {
  onLocked: () => void
}

export const assetBlobKey = "asset-blob"

function isLocked(error: unknown): boolean {
  return error instanceof GatewayRefusedError && error.isLock()
}

function shouldRetry(failures: number, error: unknown): boolean {
  if (error instanceof GatewayUnreachableError) {
    return failures < 2
  }
  if (error instanceof GatewayRefusedError) {
    return error.status >= 500 && failures < 2
  }
  return false
}

function revokeBlobs(cache: QueryCache): void {
  cache.subscribe((event) => {
    if (event.type !== "removed") {
      return
    }
    const data = event.query.state.data
    if (event.query.queryKey[0] === assetBlobKey && typeof data === "string") {
      URL.revokeObjectURL(data)
    }
  })
}

export function createQueryClient(options: QueryClientOptions): QueryClient {
  const onError = (error: unknown): void => {
    if (isLocked(error)) {
      options.onLocked()
    }
  }
  const queryCache = new QueryCache({ onError })
  revokeBlobs(queryCache)
  return new QueryClient({
    queryCache,
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        staleTime: 5000,
      },
      mutations: { retry: false },
    },
  })
}
