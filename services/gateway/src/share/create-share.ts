import type { Run } from "@rosesfield/contract"
import { assetIdFormat, type Clock } from "@rosesfield/kernel"
import type { AssetStore } from "@rosesfield/library"
import type { Handlers } from "#build-handlers"
import { ShareNotReadyError } from "#share/share-not-ready.error"
import type { SharedMedia } from "#share/share-tables"
import type {
  ShareRecord,
  SqliteShareRepository,
} from "#share/sqlite-share-repository"

export type ShareParts = {
  shares: SqliteShareRepository
  store: AssetStore
  clock: Clock
}

type ShareRequest = {
  runId: string
  sessionId: string | null
}

export const shareDays = 90

const dayMs = 86_400_000
const sharedKinds: readonly string[] = ["image", "video", "audio"]

function isSharedKind(kind: string): kind is SharedMedia["kind"] {
  return sharedKinds.includes(kind)
}

export function shareIdOf(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
}

export function publicRunOf(run: Run): Run {
  const inputs = Object.fromEntries(
    Object.entries(run.inputs).map(([name, value]) => [
      name,
      Array.isArray(value) ? [] : value,
    ])
  )
  return { ...run, inputs, outputs: [], failure: null }
}

async function copyOutput(
  handlers: Handlers,
  parts: ShareParts,
  assetId: string
): Promise<SharedMedia | null> {
  const { asset, bytes } = await handlers.readAssetContent.execute({ assetId })
  if (!isSharedKind(asset.kind)) {
    return null
  }
  const key = assetIdFormat.parse(crypto.randomUUID())
  await parts.store.put(key, new Uint8Array(bytes), asset.mime)
  return {
    key,
    kind: asset.kind,
    mime: asset.mime,
    width: asset.width,
    height: asset.height,
    durationSeconds: asset.durationSeconds,
  }
}

export async function createShare(
  handlers: Handlers,
  parts: ShareParts,
  request: ShareRequest
): Promise<ShareRecord> {
  const { run } = await handlers.getRun.execute({ runId: request.runId })
  if (run.status !== "done" || run.outputs.length === 0) {
    throw new ShareNotReadyError({ runId: run.id })
  }
  const now = parts.clock.now().getTime()
  const held = await parts.shares.ofRun(run.id, request.sessionId, now)
  if (held !== null) {
    return held
  }
  const media: SharedMedia[] = []
  for (const assetId of run.outputs) {
    const copied = await copyOutput(handlers, parts, assetId)
    if (copied !== null) {
      media.push(copied)
    }
  }
  if (media.length === 0) {
    throw new ShareNotReadyError({ runId: run.id })
  }
  const record: ShareRecord = {
    id: shareIdOf(),
    runId: run.id,
    sessionId: request.sessionId,
    run: publicRunOf(run),
    media,
    placement: "link",
    createdAt: now,
    expiresAt: now + shareDays * dayMs,
  }
  await parts.shares.add(record)
  return record
}
