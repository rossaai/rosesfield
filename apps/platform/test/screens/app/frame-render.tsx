import { findApp } from "@rosesfield/catalog"
import {
  type AppListing,
  appListing,
  type Run,
  run,
} from "@rosesfield/contract"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { ReactElement, ReactNode } from "react"
import { vi } from "vitest"
import { runsQuery } from "@/api/queries"
import type { StartRun } from "@/screens/app/use-start-run"

export const video = appListing.parse(findApp("video"))
export const image = appListing.parse(findApp("image"))

export const start: StartRun = {
  generate: () => undefined,
  isPending: false,
  error: null,
  price: "",
}

export function doneRun(appId: string): Run {
  return run.parse({
    id: "93e9078d-0000-4000-8000-000000000001",
    appId,
    status: "done",
    inputs: {},
    count: 1,
    aspectRatio: null,
    seed: null,
    outputs: [],
    progress: null,
    engine: { adapter: "demo", models: [], workflowHash: null },
    cost: null,
    origin: "live",
    failure: null,
    createdAt: "2026-10-20T10:00:00.000Z",
    finishedAt: "2026-10-20T10:00:03.000Z",
  })
}

export function withClient(
  children: ReactNode,
  app: AppListing,
  runs: readonly Run[] | null
): ReactElement {
  const client = new QueryClient()
  if (runs !== null) {
    client.setQueryData(runsQuery(app.id).queryKey, {
      pages: [{ runs: [...runs], next: null }],
      pageParams: [null],
    })
  }
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )
}

export function asPhone(): void {
  document.documentElement.style.setProperty("--container-regular", "768px")
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
}

export function resetFrames(): void {
  vi.unstubAllGlobals()
  document.documentElement.style.removeProperty("--container-regular")
}

export function stubFetch(): void {
  vi.stubGlobal("fetch", () => new Promise(() => undefined))
}
