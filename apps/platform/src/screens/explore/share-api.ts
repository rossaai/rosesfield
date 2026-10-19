import { type Run, run } from "@rosesfield/contract"
import { queryOptions } from "@tanstack/react-query"
import { fieldOf, invalidResponse, oneOf } from "@/api/call-path"
import { credentialHeaders, refusalOf } from "@/api/call-route"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"

export type SharedKind = "image" | "video" | "audio"

export type SharedMedia = {
  index: number
  src: string
  kind: SharedKind
  mime: string
  width: number | null
  height: number | null
}

export type ShareView = {
  id: string
  path: string
  run: Run
  media: SharedMedia[]
  poster: string | null
}

const kinds: readonly SharedKind[] = ["image", "video", "audio"]

function sizeOf(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null
}

function mediaOf(path: string, value: unknown): SharedMedia | null {
  const index = fieldOf(value, "index")
  const kind = oneOf(fieldOf(value, "kind"), kinds)
  const mime = fieldOf(value, "mime")
  if (typeof index !== "number" || kind === null || typeof mime !== "string") {
    return null
  }
  return {
    index,
    src: `${path}/media/${index}`,
    kind,
    mime,
    width: sizeOf(fieldOf(value, "width")),
    height: sizeOf(fieldOf(value, "height")),
  }
}

export function readShare(value: unknown): ShareView | null {
  const id = fieldOf(value, "id")
  const path = fieldOf(value, "path")
  const poster = fieldOf(value, "poster")
  const media = fieldOf(value, "media")
  const parsed = run.safeParse(fieldOf(value, "run"))
  if (
    typeof id !== "string" ||
    typeof path !== "string" ||
    !(poster === null || typeof poster === "string") ||
    !Array.isArray(media) ||
    !parsed.success
  ) {
    return null
  }
  const items = media.map((item) => mediaOf(path, item))
  if (!items.every((item): item is SharedMedia => item !== null)) {
    return null
  }
  return { id, path, run: parsed.data, media: items, poster }
}

async function send(path: string, init: RequestInit): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (error) {
    throw new GatewayUnreachableError({ cause: error })
  }
  if (!response.ok) {
    throw await refusalOf(response)
  }
  const body: unknown = await response.json().catch(() => null)
  if (body === null) {
    throw invalidResponse(response.status)
  }
  return body
}

async function shareOf(path: string, init: RequestInit): Promise<ShareView> {
  const share = readShare(fieldOf(await send(path, init), "share"))
  if (share === null) {
    throw invalidResponse(200)
  }
  return share
}

export function shareRun(
  runId: string,
  poster: Blob | null
): Promise<ShareView> {
  return shareOf(`/api/runs/${encodeURIComponent(runId)}/share`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...credentialHeaders(),
      ...(poster === null ? {} : { "Content-Type": poster.type }),
    },
    ...(poster === null ? {} : { body: poster }),
  })
}

export function shareQuery(shareId: string) {
  return queryOptions({
    queryKey: ["share", shareId],
    queryFn: ({ signal }) =>
      shareOf(`/share/${encodeURIComponent(shareId)}/data`, { signal }),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
}

export const publishedQuery = queryOptions({
  queryKey: ["shares", "published"],
  queryFn: async ({ signal }): Promise<ShareView[]> => {
    const list = fieldOf(await send("/share", { signal }), "shares")
    if (!Array.isArray(list)) {
      throw invalidResponse(200)
    }
    return list.flatMap((item) => {
      const share = readShare(item)
      return share === null ? [] : [share]
    })
  },
  staleTime: 300_000,
})
