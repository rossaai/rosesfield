import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { type ReactElement, useEffect } from "react"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { ExploreScreen } from "@/screens/explore/explore-screen"
import {
  SettingsScreen,
  type SettingsSection,
  settingsSections,
} from "@/screens/settings/settings-screen"
import { readOneOf } from "@/shell/search"
import { useOpenSettings } from "@/shell/shell-dialogs"

type SettingsSearch = {
  section?: SettingsSection
}

export const Route = createFileRoute("/_shell/settings")({
  validateSearch: (search: Record<string, unknown>): SettingsSearch => {
    const section = readOneOf(search.section, settingsSections)
    return section === undefined ? {} : { section }
  },
  component: SettingsRoute,
})

function SettingsOverExplore({
  section,
}: {
  section: SettingsSection | undefined
}): ReactElement {
  const openSettings = useOpenSettings()
  const navigate = useNavigate()
  useEffect(() => {
    openSettings(section)
    void navigate({ to: "/", replace: true })
  }, [section, openSettings, navigate])
  return <ExploreScreen />
}

function SettingsRoute(): ReactElement {
  const { section } = Route.useSearch()
  const isRegular = useIsRegularWindow()
  return isRegular ? (
    <SettingsOverExplore section={section} />
  ) : (
    <SettingsScreen section={section} />
  )
}
