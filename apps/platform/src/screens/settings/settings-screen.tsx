import { Card, CardTitle } from "@rosesfield/ui/components/card"
import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import { Link } from "@tanstack/react-router"
import { type ReactElement, useState } from "react"
import { t } from "@/copy/t"
import { EngineCard } from "@/screens/settings/engine-card"
import { AgentCard, LockCard } from "@/screens/settings/settings-cards"
import { ScreenHeader } from "@/shell/screen-header"
import {
  keepThemeChoice,
  readThemeChoice,
  type ThemeChoice,
} from "@/theme/theme-choice"

const themes: SegmentedItem<ThemeChoice>[] = [
  { value: "system", label: t("settings.theme.system") },
  { value: "light", label: t("settings.theme.light") },
  { value: "dark", label: t("settings.theme.dark") },
]

const sourceLink = "https://github.com/rossaai/rosesfield"
const licencesLink =
  "https://github.com/rossaai/rosesfield#engines-and-licences"
const targetsLink = "https://github.com/rossaai/rosesfield#engine-targets"

function AppearanceCard(): ReactElement {
  const [theme, setTheme] = useState(readThemeChoice)
  return (
    <Card>
      <CardTitle>{t("settings.appearance.title")}</CardTitle>
      <SegmentedControl
        items={themes}
        value={theme}
        onValueChange={(next) => {
          setTheme(next)
          keepThemeChoice(next)
        }}
        label={t("settings.theme.label")}
      />
    </Card>
  )
}

function AboutCard(): ReactElement {
  const linkClass = "text-body text-hor-text underline"
  return (
    <Card>
      <CardTitle>{t("settings.about.title")}</CardTitle>
      {__APP_VERSION__ === "" ? null : (
        <p className="text-body">
          {t("settings.about.version", { version: __APP_VERSION__ })}
        </p>
      )}
      <ul className="flex flex-col gap-s2">
        <li>
          <Link to="/welcome" className={linkClass}>
            {t("settings.about.welcome")}
          </Link>
        </li>
        <li>
          <a
            href={sourceLink}
            className={linkClass}
            target="_blank"
            rel="noreferrer"
          >
            {t("settings.about.code")}
          </a>
        </li>
        <li>
          <a
            href={targetsLink}
            className={linkClass}
            target="_blank"
            rel="noreferrer"
          >
            {t("settings.about.targets")}
          </a>
        </li>
        <li>
          <a
            href={licencesLink}
            className={linkClass}
            target="_blank"
            rel="noreferrer"
          >
            {t("settings.about.licences")}
          </a>
        </li>
      </ul>
      <p className="text-legal text-ink-muted">
        {t("settings.about.trademark")}
      </p>
    </Card>
  )
}

export function SettingsScreen(): ReactElement {
  return (
    <>
      <ScreenHeader title={t("settings.title")} />
      <div className="flex w-full max-w-[calc(var(--spacing-prompt-max)+2*var(--spacing-s5))] flex-col gap-s4 px-s5 pb-s12 @regular:max-w-[calc(var(--spacing-prompt-max)+2*var(--spacing-s4))] @regular:px-s4">
        <EngineCard />
        <AgentCard />
        <LockCard />
        <AppearanceCard />
        <AboutCard />
      </div>
    </>
  )
}
