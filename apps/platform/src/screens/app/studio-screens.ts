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

const loaded = new Map<
  string,
  LazyExoticComponent<ComponentType<StudioScreenProps>>
>()

function loaderFor(appId: string): (() => Promise<unknown>) | null {
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
  const screen = lazy(async () => {
    const module = await loader()
    if (!isStudioModule(module)) {
      throw new Error(`studio/${appId}/screen.tsx exports no AppScreen`)
    }
    return { default: module.AppScreen }
  })
  loaded.set(appId, screen)
  return screen
}
