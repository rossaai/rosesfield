import { RouterHttp } from "#infrastructure/router/router-http"
import type { ReplayFetch } from "./replay-fetch"

export function heldBack(
  replay: ReplayFetch,
  model: string
): { http: RouterHttp; release: () => void } {
  let release: () => void = () => undefined
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const http = new RouterHttp({
    apiKey: "key",
    fetch: async (input, init) => {
      if (input.toString().includes(model)) {
        await released
      }
      return replay.fetch(input, init)
    },
    timeoutMs: 1000,
    downloadTimeoutMs: 1000,
  })
  return { http, release }
}

export function settled<T>(promise: Promise<T>): Promise<boolean> {
  const later = new Promise<false>((resolve) =>
    setTimeout(() => resolve(false), 20)
  )
  return Promise.race([promise.then(() => true), later])
}
