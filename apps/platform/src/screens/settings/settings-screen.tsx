import { IconButton } from "@rosesfield/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@rosesfield/ui/components/dialog"
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

export type PaneArrival = "none" | "below" | "above"

export type SettingsPlace = { section: SettingsSection; arrival: PaneArrival }

export function placeAfter(
  was: SettingsPlace,
  next: SettingsSection
): SettingsPlace {
  const from = settingsSections.indexOf(was.section)
  const to = settingsSections.indexOf(next)
  if (from === to) {
    return was
  }
  return { section: next, arrival: to > from ? "below" : "above" }
}

const contentArrivals = {
  none: "",
  below: "starting:translate-y-s5",
  above: "starting:-translate-y-s5",
} satisfies Record<PaneArrival, string>

const titleArrivals = {
  none: "",
  below: "starting:translate-y-s2_5",
  above: "starting:-translate-y-s2_5",
} satisfies Record<PaneArrival, string>

function ModalRail({
  current,
  onSection,
}: {
  current: SettingsSection
  onSection: (section: SettingsSection) => void
}): ReactElement {
  const labelOf = useSectionLabel()
  const index = Math.max(0, settingsSections.indexOf(current))
  return (
    <nav
      aria-label={t("settings.title")}
      data-slot="settings-rail"
      className="relative flex w-settings-rail shrink-0 flex-col gap-s1 bg-layer-well px-s3 py-s4"
    >
      <span
        aria-hidden="true"
        data-slot="settings-rail-thumb"
        className={cn(
          "absolute inset-x-s3 top-s4 h-button rounded-full bg-ink",
          motion.travel
        )}
        style={{
          translate: `0 calc(${index} * (var(--spacing-button) + var(--spacing-s1)))`,
        }}
      />
      {settingsSections.map((section) => (
        <button
          key={section}
          type="button"
          aria-current={section === current ? "page" : undefined}
          data-slot="settings-row"
          onClick={() => onSection(section)}
          className={cn(
            settingsNavRowClass,
            "aria-[current=page]:bg-transparent aria-[current=page]:**:text-canvas"
          )}
        >
          <SettingsRowBody
            icon={specs[section].icon}
            label={labelOf(section)}
          />
        </button>
      ))}
    </nav>
  )
}

function ModalPane({ place }: { place: SettingsPlace }): ReactElement {
  const labelOf = useSectionLabel()
  const { section, arrival } = place
  return (
    <section
      aria-label={labelOf(section)}
      data-slot="settings-modal-pane"
      className="flex min-w-0 flex-1 flex-col overflow-y-auto"
    >
      <header className="sticky top-0 z-1 flex h-header shrink-0 items-center overflow-hidden bg-layer ps-[calc(var(--spacing-s4)+var(--spacing-s1)+var(--spacing-s4)+var(--spacing-glyph)+var(--spacing-s3))] pe-s12">
        <DialogTitle
          key={section}
          className={cn("truncate", motion.travel, titleArrivals[arrival])}
        >
          {labelOf(section)}
        </DialogTitle>
      </header>
      <div
        key={section}
        className={cn("px-s4 pb-s4", motion.travel, contentArrivals[arrival])}
      >
        <Pane section={section} />
      </div>
    </section>
  )
}

export function SettingsModal({
  open,
  place,
  onSection,
  onOpenChange,
}: {
  open: boolean
  place: SettingsPlace
  onSection: (section: SettingsSection) => void
  onOpenChange: (open: boolean) => void
}): ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t("viewer.close")}
        data-slot="settings-modal"
        className="h-[min(var(--spacing-settings-modal-h),calc(100dvh-2*var(--spacing-s6)))] w-[min(var(--spacing-settings-modal-w),calc(100%-2*var(--spacing-s5)))] flex-row gap-0 overflow-hidden p-0"
      >
        <ModalRail current={place.section} onSection={onSection} />
        <ModalPane place={place} />
      </DialogContent>
    </Dialog>
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
  return section === undefined ? <PhoneList /> : <PhonePane section={section} />
}
