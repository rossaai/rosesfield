import {
  buildPath,
  type ShareView,
  shareListResponse,
  sharePaths,
  shareResponse,
  shareRoutes,
} from "@rosesfield/contract"
import { queryOptions } from "@tanstack/react-query"
import { invalidResponse } from "@/api/call-path"
import { credentialHeaders, refusalOf } from "@/api/call-route"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"

export type SharedOutput = ShareView & { sources: string[] }

export function sharedOutputOf(share: ShareView): SharedOutput {
  return {
    ...share,
    sources: share.media.map((media) =>
      buildPath(sharePaths.media, {
        shareId: share.id,
        index: String(media.index),
      })
    ),
  }
}

type Schema<Value> = {
  safeParse: (
    value: unknown
  ) => { success: true; data: Value } | { success: false }
}

async function send<Value>(
  path: string,
  init: RequestInit,
  schema: Schema<Value>
): Promise<Value> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (error) {
    throw new GatewayUnreachableError({ cause: error })
  }
  if (!response.ok) {
    throw await refusalOf(response)
  }
  const parsed = schema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw invalidResponse(response.status)
  }
  return parsed.data
}

export async function shareRun(runId: string): Promise<SharedOutput> {
  const route = shareRoutes.shareRun
  const { share } = await send(
    buildPath(route.path, { runId }),
    {
      method: route.method,
      headers: { Accept: "application/json", ...credentialHeaders() },
    },
    shareResponse
  )
  return sharedOutputOf(share)
}

const pageDataId = "rosesfield-share"

export function shareInPage(shareId: string): SharedOutput | undefined {
  const text = document.getElementById(pageDataId)?.textContent
  if (text === undefined || text === null) {
    return undefined
  }
  try {
    const parsed = shareResponse.safeParse(JSON.parse(text))
    return parsed.success && parsed.data.share.id === shareId
      ? sharedOutputOf(parsed.data.share)
      : undefined
  } catch {
    return undefined
  }
}

export function shareQuery(shareId: string) {
  return queryOptions({
    queryKey: ["share", shareId],
    queryFn: async ({ signal }) => {
      const { share } = await send(
        buildPath(sharePaths.data, { shareId }),
        { signal },
        shareResponse
      )
      return sharedOutputOf(share)
    },
    initialData: () => shareInPage(shareId),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}

export const publishedQuery = queryOptions({
  queryKey: ["shares", "published"],
  queryFn: async ({ signal }): Promise<SharedOutput[]> => {
    const { shares } = await send(
      sharePaths.list,
      { signal },
      shareListResponse
    )
    return shares.map(sharedOutputOf)
  },
  staleTime: 300_000,
})
