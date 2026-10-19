import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactElement, type ReactNode, useState } from "react"
import { assetBlobKey } from "@/api/query-client"
import {
  galleryAssets,
  galleryRun,
  gallerySources,
} from "@/gallery/fixtures/platform-fixtures"

function seededClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Number.POSITIVE_INFINITY, retry: false },
    },
  })
  for (const asset of Object.values(galleryAssets)) {
    client.setQueryData(["asset", asset.id], { asset })
  }
  for (const [assetId, src] of gallerySources) {
    client.setQueryData([assetBlobKey, assetId], src)
  }
  client.setQueryData(["settings"], {
    engine: { key: "missing", origin: "demo" },
    lock: "local",
    agent: "missing",
  })
  const done = galleryRun({})
  client.setQueryData(["run", done.id], { run: done })
  return client
}

export function GalleryData({
  children,
}: {
  children: ReactNode
}): ReactElement {
  const [client] = useState(seededClient)
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
