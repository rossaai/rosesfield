import {
  type Asset,
  type AssetPlace,
  errorEnvelope,
  routes,
} from "@rosesfield/contract"
import { credentialHeaders } from "@/api/call-route"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { GatewayUnreachableError } from "@/api/gateway-unreachable.error"

type UploadOptions = {
  file: Blob
  onProgress: (fraction: number) => void
  signal?: AbortSignal
  place?: AssetPlace
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function refused(request: XMLHttpRequest, code: string): GatewayRefusedError {
  return new GatewayRefusedError({
    code,
    status: request.status,
    retryAfterSeconds: null,
  })
}

function settle(request: XMLHttpRequest): Asset {
  const body = safeJson(request.responseText)
  if (request.status < 200 || request.status >= 300) {
    const envelope = errorEnvelope.safeParse(body)
    throw refused(
      request,
      envelope.success ? envelope.data.error.code : "SERVER_ERROR"
    )
  }
  const parsed = routes.uploadAsset.response.safeParse(body)
  if (!parsed.success) {
    throw refused(request, "RESPONSE_INVALID")
  }
  return parsed.data.asset
}

export function uploadAsset(options: UploadOptions): Promise<Asset> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    const path =
      options.place === undefined
        ? routes.uploadAsset.path
        : `${routes.uploadAsset.path}?${new URLSearchParams({ place: options.place })}`
    request.open(routes.uploadAsset.method, path)
    for (const [name, value] of Object.entries(credentialHeaders())) {
      request.setRequestHeader(name, value)
    }
    request.setRequestHeader(
      "Content-Type",
      options.file.type || "application/octet-stream"
    )
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        options.onProgress(event.loaded / event.total)
      }
    }
    request.onload = () => {
      try {
        resolve(settle(request))
      } catch (error) {
        reject(error)
      }
    }
    request.onerror = () =>
      reject(new GatewayUnreachableError({ cause: request.statusText }))
    request.onabort = () =>
      reject(new DOMException("The upload stopped", "AbortError"))
    options.signal?.addEventListener("abort", () => request.abort())
    request.send(options.file)
  })
}
