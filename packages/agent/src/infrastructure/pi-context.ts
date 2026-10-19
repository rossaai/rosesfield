import type { Harness } from "@earendil-works/pi-durable"

export type PiContext = Parameters<Harness["close"]>[0]

export const backgroundContext: PiContext = {
  abortSignal: undefined,
  value: () => undefined,
  toString: () => "[Context rosesfield agent]",
}
