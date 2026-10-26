import { useNavigate, useSearch } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { appName } from "@/catalog/app-facts"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import { AppHistoryIcon, AppHistoryLink } from "@/screens/app/app-header"
import { noSeeds } from "@/screens/app/use-app-screen"
import { ScreenHeader } from "@/shell/screen-header"
import {
  CharacterTabs,
  type MakeMode,
} from "@/studio/characters/character-tabs"
import { PhotosColumn } from "@/studio/characters/photos-column"
import { ModeView } from "@/studio/characters/screen"

export function NewCharacterScreen(): ReactElement {
  const search = useSearch({ from: "/_shell/characters/new" })
  const navigate = useNavigate({ from: "/characters/new" })
  const traitsApp = findCatalogApp("characters")
  const mode: MakeMode =
    traitsApp !== null && search.mode === "traits" ? "traits" : "photos"
  const tabs =
    traitsApp === null ? undefined : (
      <CharacterTabs
        mode={mode}
        onChange={(next) =>
          void navigate({ search: { mode: next }, replace: true })
        }
      />
    )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScreenHeader
        title={t("characters.new.title")}
        {...(mode === "traits" && traitsApp !== null
          ? {
              actions: <AppHistoryLink app={traitsApp} />,
              phoneAction: <AppHistoryIcon app={traitsApp} />,
            }
          : {})}
      />
      <div className="min-h-0 flex-1">
        {mode === "traits" && traitsApp !== null ? (
          <ModeView app={traitsApp} mode="traits" seeds={noSeeds} tabs={tabs} />
        ) : (
          <PhotosColumn
            label={
              traitsApp === null
                ? t("characters.new.title")
                : appName(traitsApp)
            }
            tabs={tabs}
          />
        )}
      </div>
    </div>
  )
}
