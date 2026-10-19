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

const loaders = import.meta.glob<StudioModule>("../../studio/*/screen.tsx")

const loaded = new Map<
  string,
  LazyExoticComponent<ComponentType<StudioScreenProps>>
>()

function loaderFor(appId: string): (() => Promise<StudioModule>) | null {
  const entry = Object.entries(loaders).find(([path]) =>
    path.endsWith(`/studio/${appId}/screen.tsx`)
  )
  return entry === undefined ? null : entry[1]
}

export function studioScreenFor(
  appId: string
): LazyExoticComponent<ComponentType<StudioScreenProps>> | null {
  const cached = loaded.get(appId)
  if (cached !== undefined) {
    return cached
  }
  const loader = loaderFor(appId)
  if (loader === null) {
    return null
  }
  const screen = lazy(async () => ({ default: (await loader()).AppScreen }))
  loaded.set(appId, screen)
  return screen
}
