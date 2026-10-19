import type { Asset } from "@rosesfield/contract"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"
import { isAbort } from "@/api/call-route"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { uploadAsset } from "@/api/upload-asset"

export type Upload = {
  key: string
  file: File
  progress: number
  status: "uploading" | "done" | "failed" | "unsupported"
  asset: Asset | null
}

export type Uploads = {
  uploads: Upload[]
  start: (files: readonly File[]) => Promise<Asset[]>
  retry: (key: string) => Promise<Asset[]>
  stop: (key: string) => void
  remove: (key: string) => void
}

type Patch = (key: string, change: Partial<Upload>) => void

const unsupportedCodes: readonly string[] = [
  "ASSET_KIND_UNSUPPORTED",
  "ASSET_INVALID",
  "ASSET_TOO_LARGE",
  "BODY_TOO_LARGE",
]

function failureOf(error: unknown): Upload["status"] {
  return error instanceof GatewayRefusedError &&
    unsupportedCodes.includes(error.code)
    ? "unsupported"
    : "failed"
}

async function send(
  upload: Pick<Upload, "key" | "file">,
  patch: Patch,
  controllers: Map<string, AbortController>
): Promise<Asset | null> {
  const controller = new AbortController()
  controllers.set(upload.key, controller)
  try {
    const asset = await uploadAsset({
      file: upload.file,
      signal: controller.signal,
      onProgress: (progress) => patch(upload.key, { progress }),
    })
    patch(upload.key, { status: "done", progress: 1, asset })
    return asset
  } catch (error) {
    patch(upload.key, { status: isAbort(error) ? "failed" : failureOf(error) })
    return null
  } finally {
    controllers.delete(upload.key)
  }
}

function fresh(file: File): Upload {
  return {
    key: crypto.randomUUID(),
    file,
    progress: 0,
    status: "uploading",
    asset: null,
  }
}

export function useUploads(): Uploads {
  const [uploads, setUploads] = useState<Upload[]>([])
  const controllers = useRef(new Map<string, AbortController>())
  const client = useQueryClient()
  const patch = useCallback<Patch>((key, change) => {
    setUploads((current) =>
      current.map((one) => (one.key === key ? { ...one, ...change } : one))
    )
  }, [])
  const run = useCallback(
    async (batch: readonly Upload[]): Promise<Asset[]> => {
      const sent = await Promise.all(
        batch.map((one) => send(one, patch, controllers.current))
      )
      void client.invalidateQueries({ queryKey: ["assets"] })
      return sent.filter((asset): asset is Asset => asset !== null)
    },
    [patch, client]
  )
  const start = useCallback(
    (files: readonly File[]): Promise<Asset[]> => {
      const added = files.map(fresh)
      setUploads((current) => [...added, ...current])
      return run(added)
    },
    [run]
  )
  const retry = useCallback(
    (key: string): Promise<Asset[]> => {
      const upload = uploads.find((one) => one.key === key)
      patch(key, { status: "uploading", progress: 0 })
      return upload === undefined ? Promise.resolve([]) : run([upload])
    },
    [uploads, patch, run]
  )
  const stop = useCallback((key: string) => {
    controllers.current.get(key)?.abort()
  }, [])
  const remove = useCallback((key: string) => {
    controllers.current.get(key)?.abort()
    setUploads((current) => current.filter((one) => one.key !== key))
  }, [])
  return { uploads, start, retry, stop, remove }
}
