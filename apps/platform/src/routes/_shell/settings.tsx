import { createFileRoute } from "@tanstack/react-router"
import type { ReactElement } from "react"
import {
  SettingsScreen,
  type SettingsSection,
  settingsSections,
} from "@/screens/settings/settings-screen"
import { readOneOf } from "@/shell/search"

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

function SettingsRoute(): ReactElement {
  return <SettingsScreen section={Route.useSearch().section} />
}
