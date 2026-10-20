import { Badge } from "@rosesfield/ui/components/badge"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import {
  FilterChip,
  FilterChipRow,
  SettingChoice,
  SettingGroup,
  SettingGroups,
} from "@rosesfield/ui/components/filter-chip"
import {
  ModeStrip,
  ModeTab,
  SegmentedTab,
  SegmentedTabs,
  Tabs,
} from "@rosesfield/ui/components/tabs"
import {
  BookOpenIcon,
  CameraIcon,
  ChevronLeftIcon,
  CloudRainIcon,
  CopyIcon,
  DropletIcon,
  FolderIcon,
  LayoutGridIcon,
  ListIcon,
  MoveRightIcon,
  Rotate3dIcon,
  SunIcon,
  Volume2Icon,
  XIcon,
} from "lucide-react"
import type { ReactElement } from "react"
import { t } from "@/gallery/copy.en"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { frameState, interactionStates } from "@/gallery/reference-frames"

function Foundations(): ReactElement {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-1">
        {[1, 2, 3, 4, 6, 8, 12, 16].map((step) => (
          <span
            key={step}
            className="w-4 bg-ink"
            style={{ height: `calc(var(--spacing) * ${step})` }}
          />
        ))}
      </div>
      <p className="text-body">{t("sample.foundations.step")}</p>
      <p className="text-body">{t("sample.foundations.gutter")}</p>
      <p className="text-body">{t("sample.foundations.switch")}</p>
    </div>
  )
}

function Buttons(): ReactElement {
  return (
    <div className="flex flex-col items-start gap-4">
      <div
        data-slot="hero-pair"
        className="flex gap-2 self-stretch @regular:justify-end"
      >
        <Button size="hero" tone="primary">
          {t("sample.start")}
        </Button>
        <Button size="hero">{t("sample.learnMore")}</Button>
      </div>
      <Button size="recreate" tone="accent" className="rounded-dense">
        <CopyIcon aria-hidden="true" />
        {t("sample.recreate")}
      </Button>
      <Button size="recreateSmall" tone="accent" className="rounded-dense">
        <CopyIcon aria-hidden="true" />
        {t("sample.recreate")}
      </Button>
      <Button size="hero" disabled>
        {t("sample.start")}
      </Button>
    </div>
  )
}

function GlyphButtons(): ReactElement {
  const places = [
    "barCompact",
    "bar",
    "close",
    "card",
    "cardWide",
    "clip",
  ] as const
  return (
    <div className="flex flex-wrap items-center gap-3">
      {places.map((place) => (
        <IconButton key={place} label={t("sample.close")} place={place}>
          <XIcon aria-hidden="true" />
        </IconButton>
      ))}
      <IconButton label={t("sample.previous")} place="carousel">
        <ChevronLeftIcon aria-hidden="true" />
      </IconButton>
      <IconButton label={t("sample.sound")} place="clip" tone="glass">
        <Volume2Icon aria-hidden="true" />
      </IconButton>
    </div>
  )
}

function TabsDemo(): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="create">
        <ModeStrip aria-label={t("sample.mode.create")}>
          <ModeTab value="create">{t("sample.mode.create")}</ModeTab>
          <ModeTab value="edit">{t("sample.mode.edit")}</ModeTab>
          <ModeTab value="motion">{t("sample.mode.motion")}</ModeTab>
        </ModeStrip>
      </Tabs>
      <Tabs defaultValue="how">
        <SegmentedTabs aria-label={t("sample.canvas.label")}>
          <SegmentedTab value="history" icon={<FolderIcon />}>
            {t("sample.tab.history")}
          </SegmentedTab>
          <SegmentedTab value="how" icon={<BookOpenIcon />}>
            {t("sample.tab.how")}
          </SegmentedTab>
        </SegmentedTabs>
      </Tabs>
      <Tabs defaultValue="list">
        <SegmentedTabs form="well" aria-label={t("sample.canvas.label")}>
          <SegmentedTab value="list" icon={<ListIcon />}>
            {t("sample.view.list")}
          </SegmentedTab>
          <SegmentedTab value="grid" icon={<LayoutGridIcon />}>
            {t("sample.view.grid")}
          </SegmentedTab>
        </SegmentedTabs>
      </Tabs>
    </div>
  )
}

const presetKeys = [
  "sample.preset.melt",
  "sample.preset.dolly",
  "sample.preset.orbit",
  "sample.preset.rain",
] as const

const presetPictures = [
  <DropletIcon key="melt" />,
  <MoveRightIcon key="dolly" />,
  <Rotate3dIcon key="orbit" />,
  <CloudRainIcon key="rain" />,
]

function Chips({ open }: { open: boolean }): ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <FilterChipRow label={t("sample.presets")}>
        {presetKeys.map((key) => (
          <FilterChip
            key={key}
            href={`?preset=${key}`}
            {...(key === "sample.preset.orbit"
              ? { tag: t("sample.badge.new") }
              : {})}
          >
            {t(key)}
          </FilterChip>
        ))}
      </FilterChipRow>
      <div className="w-76">
        <SettingGroups>
          <SettingGroup
            name={t("sample.group.camera")}
            count={12}
            icon={<CameraIcon />}
            defaultOpen={open}
          >
            {presetKeys.map((key, index) => (
              <SettingChoice
                key={key}
                label={t(key)}
                picture={presetPictures[index]}
                isCurrent={index === 0}
                onChoose={() => undefined}
              />
            ))}
          </SettingGroup>
          <SettingGroup
            name={t("sample.group.light")}
            count={8}
            icon={<SunIcon />}
          >
            <span />
          </SettingGroup>
        </SettingGroups>
      </div>
    </div>
  )
}

function Badges(): ReactElement {
  return (
    <div className="flex flex-col items-start gap-4">
      <span className="flex items-center text-body">
        {t("sample.model")}
        <Badge kind="new">{t("sample.badge.new")}</Badge>
        <Badge kind="top">{t("sample.badge.top")}</Badge>
      </span>
      <span className="flex items-center text-body">
        {t("sample.model")}
        <Badge kind="premium">{t("sample.badge.premium")}</Badge>
        <Badge kind="openWeights" href="https://huggingface.co/">
          {t("sample.badge.openWeights")}
        </Badge>
      </span>
    </div>
  )
}

export const referenceControlEntries: GalleryEntry[] = [
  {
    id: "ref-foundations",
    unit: "foundations",
    title: "ref.foundations",
    states: [frameState("rest", "state.rest", () => <Foundations />)],
  },
  {
    id: "ref-button",
    unit: "button",
    title: "ref.button",
    states: interactionStates(() => <Buttons />),
  },
  {
    id: "ref-icon-button",
    unit: "icon-button",
    title: "ref.iconButton",
    states: interactionStates(() => <GlyphButtons />),
  },
  {
    id: "ref-tabs",
    unit: "tabs",
    title: "ref.tabs",
    states: interactionStates(() => <TabsDemo />),
  },
  {
    id: "ref-filter-chips",
    unit: "filter-chips",
    title: "ref.filterChips",
    states: [
      ...interactionStates(() => <Chips open={false} />),
      frameState("open", "state.open", () => <Chips open />),
    ],
  },
  {
    id: "ref-badge",
    unit: "badge",
    title: "ref.badge",
    states: interactionStates(() => <Badges />),
  },
]
