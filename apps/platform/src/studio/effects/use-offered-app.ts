import {
  canTryDrafts,
  type EffectRecipe,
  effectRecipes,
  offeredEffectsApp,
  type ServerReach,
} from "@rosesfield/catalog/effects"
import { type AppListing, appListing } from "@rosesfield/contract"
import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { settingsQuery } from "@/api/queries"

export function offeredAppOf(
  shipped: AppListing,
  reach: ServerReach | undefined,
  recipes: readonly EffectRecipe[] = effectRecipes
): AppListing {
  return reach === undefined || !canTryDrafts(reach)
    ? shipped
    : appListing.parse(offeredEffectsApp(recipes, reach))
}

export function useOfferedApp(shipped: AppListing): AppListing {
  const settings = useQuery(settingsQuery).data
  return useMemo(() => offeredAppOf(shipped, settings), [shipped, settings])
}
