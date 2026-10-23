import type { AppListing } from "@rosesfield/contract"
import { type ComponentType, type LazyExoticComponent, lazy } from "react"
import type { AppSeeds } from "@/screens/app/use-app-screen"

export type StudioScreenProps = {
  app: AppListing
  seeds: AppSeeds
}

type StudioModule = {
  AppScreen: ComponentType<StudioScreenProps>
}

const loaders = import.meta.glob("../../studio/*/screen.tsx")

function isStudioModule(value: unknown): value is StudioModule {
  return (
    typeof value === "object" &&
    value !== null &&
    "AppScreen" in value &&
    typeof value.AppScreen === "function"
  )
}

type StudioScreen = ComponentType<StudioScreenProps>

const loaded = new Map<string, LazyExoticComponent<StudioScreen>>()

const ready = new Map<string, StudioScreen>()

function loaderFor(appId: string): (() => Promise<unknown>) | null {
  const entry = Object.entries(loaders).find(([path]) =>
    path.endsWith(`/studio/${appId}/screen.tsx`)
  )
  return entry === undefined ? null : entry[1]
}

async function importStudio(
  appId: string,
  loader: () => Promise<unknown>
): Promise<StudioScreen> {
  const module = await loader()
  if (!isStudioModule(module)) {
    throw new Error(`studio/${appId}/screen.tsx exports no AppScreen`)
  }
  ready.set(appId, module.AppScreen)
  return module.AppScreen
}

export async function preloadStudio(appId: string): Promise<void> {
  const loader = loaderFor(appId)
  if (loader === null || ready.has(appId)) {
    return
  }
  await importStudio(appId, loader).catch(() => undefined)
}

export function studioScreenFor(
  appId: string
): StudioScreen | LazyExoticComponent<StudioScreen> | null {
  const cached = loaded.get(appId) ?? ready.get(appId)
  if (cached !== undefined) {
    return cached
  }
  const loader = loaderFor(appId)
  if (loader === null) {
    return null
  }
  const screen = lazy(async () => ({
    default: await importStudio(appId, loader),
  }))
  loaded.set(appId, screen)
  return screen
}
