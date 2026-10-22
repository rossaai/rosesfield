import { IconButton } from "@rosesfield/ui/components/button"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  BotIcon,
  ChevronLeftIcon,
  CpuIcon,
  InfoIcon,
  LockIcon,
  SunMoonIcon,
} from "lucide-react"
import type { ReactElement } from "react"
import { settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import { EnginePane } from "@/screens/settings/engine-pane"
import {
  AboutPane,
  AgentPane,
  AppearancePane,
  LockPane,
} from "@/screens/settings/settings-panes"
import {
  SettingsGroup,
  SettingsNavBody,
  SettingsRowBody,
  settingsNavRowClass,
} from "@/screens/settings/settings-row"
import { ScreenHeader } from "@/shell/screen-header"

export type SettingsSection =
  | "engine"
  | "agent"
  | "lock"
  | "appearance"
  | "about"

export const settingsSections: readonly SettingsSection[] = [
  "engine",
  "agent",
  "lock",
  "appearance",
  "about",
]

type SectionSpec = {
  label: CopyKey
  icon: ReactElement
  pane: () => ReactElement
}

const specs: Readonly<Record<SettingsSection, SectionSpec>> = {
  engine: {
    label: "settings.engine.title",
    icon: <CpuIcon />,
    pane: EnginePane,
  },
  agent: { label: "settings.agent.title", icon: <BotIcon />, pane: AgentPane },
  lock: { label: "settings.lock.title", icon: <LockIcon />, pane: LockPane },
  appearance: {
    label: "settings.appearance.title",
    icon: <SunMoonIcon />,
    pane: AppearancePane,
  },
  about: { label: "settings.about.title", icon: <InfoIcon />, pane: AboutPane },
}

function useSectionLabel(): (section: SettingsSection) => string {
  const isPublic = useQuery(settingsQuery).data?.mode === "public"
  return (section) =>
    section === "lock" && isPublic
      ? t("settings.public.title")
      : t(specs[section].label)
}

function Pane({ section }: { section: SettingsSection }): ReactElement {
  const Body = specs[section].pane
  return (
    <div data-slot="settings-pane" className="flex flex-col gap-s4">
      <Body />
    </div>
  )
}

function Rail({ current }: { current: SettingsSection }): ReactElement {
  const labelOf = useSectionLabel()
  return (
    <nav
      aria-label={t("settings.title")}
      data-slot="settings-rail"
      className="sticky top-header flex w-60 shrink-0 flex-col gap-s1"
    >
      {settingsSections.map((section) => (
        <Link
          key={section}
          to="/settings"
          search={{ section }}
          replace={true}
          aria-current={section === current ? "page" : undefined}
          data-slot="settings-row"
          className={cn(
            settingsNavRowClass,
            section === current ? "bg-(--tint)" : ""
          )}
        >
          <SettingsRowBody
            icon={specs[section].icon}
            label={labelOf(section)}
          />
        </Link>
      ))}
    </nav>
  )
}

function WideSettings({ section }: { section: SettingsSection }): ReactElement {
  const labelOf = useSectionLabel()
  return (
    <>
      <ScreenHeader title={t("settings.title")} />
      <div className="flex w-full items-start gap-s8 px-s5 pb-s12">
        <Rail current={section} />
        <section
          aria-label={labelOf(section)}
          className="flex min-w-0 max-w-(--container-regular) flex-1 flex-col gap-s4"
        >
          <h2 className="flex h-11 items-center text-title">
            {labelOf(section)}
          </h2>
          <Pane section={section} />
        </section>
      </div>
    </>
  )
}

function PhoneList(): ReactElement {
  const labelOf = useSectionLabel()
  return (
    <>
      <ScreenHeader title={t("settings.title")} />
      <nav aria-label={t("settings.title")} className="px-s5 pb-s12">
        <SettingsGroup>
          {settingsSections.map((section) => (
            <Link
              key={section}
              to="/settings"
              search={{ section }}
              data-slot="settings-row"
              className={settingsNavRowClass}
            >
              <SettingsNavBody
                icon={specs[section].icon}
                label={labelOf(section)}
              />
            </Link>
          ))}
        </SettingsGroup>
      </nav>
    </>
  )
}

function PhonePane({ section }: { section: SettingsSection }): ReactElement {
  const labelOf = useSectionLabel()
  return (
    <div className="overflow-x-clip">
      <div
        data-slot="settings-pushed"
        className={cn(
          "flex flex-col",
          motion.pane,
          "starting:translate-x-full"
        )}
      >
        <header className="flex h-header shrink-0 items-center gap-s3 px-s5">
          <IconButton
            label={t("settings.title")}
            tone="quiet"
            render={<Link to="/settings" />}
            nativeButton={false}
          >
            <ChevronLeftIcon aria-hidden="true" />
          </IconButton>
          <h1 className="min-w-0 flex-1 truncate text-body font-medium">
            {labelOf(section)}
          </h1>
        </header>
        <div className="px-s5 pb-s12">
          <Pane section={section} />
        </div>
      </div>
    </div>
  )
}

export function SettingsScreen({
  section,
}: {
  section: SettingsSection | undefined
}): ReactElement {
  const isRegular = useIsRegularWindow()
  if (isRegular) {
    return <WideSettings section={section ?? "engine"} />
  }
  return section === undefined ? <PhoneList /> : <PhonePane section={section} />
}
