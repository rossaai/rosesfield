import { Badge } from "@rosesfield/ui/components/badge"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import {
  FilterChip,
  FilterChipRow,
  SettingChoice,
  SettingGroup,
  SettingGroups,
} from "@rosesfield/ui/components/filter-chip"
import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
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
import {
  confirmStates,
  inlineChipState,
} from "@/gallery/entries/reference-kernel"
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
        <Button tone="primary">{t("sample.start")}</Button>
        <Button>{t("sample.learnMore")}</Button>
      </div>
      <Button size="small" tone="glass">
        <CopyIcon aria-hidden="true" />
        {t("sample.recreate")}
      </Button>
      <Button size="dense" tone="quiet">
        <CopyIcon aria-hidden="true" />
        {t("sample.recreate")}
      </Button>
      <Button disabled>{t("sample.start")}</Button>
    </div>
  )
}

function GlyphButtons(): ReactElement {
  const sizes = ["default", "dense", "small", "badge"] as const
  return (
    <div className="flex flex-wrap items-center gap-3">
      {sizes.map((size) => (
        <IconButton key={size} label={t("sample.close")} size={size}>
          <XIcon aria-hidden="true" />
        </IconButton>
      ))}
      <IconButton label={t("sample.previous")} tone="glass">
        <ChevronLeftIcon aria-hidden="true" />
      </IconButton>
      <IconButton label={t("sample.sound")} size="dense" tone="glass">
        <Volume2Icon aria-hidden="true" />
      </IconButton>
    </div>
  )
}

const densities = ["chrome", "composer", "row"] as const

function TabsDemo(): ReactElement {
  return (
    <div className="flex flex-col items-start gap-6">
      {densities.map((density) => (
        <SegmentedControl
          key={density}
          density={density}
          label={t("sample.canvas.label")}
          value="create"
          onValueChange={() => undefined}
          items={[
            { value: "create", label: t("sample.mode.create") },
            { value: "edit", label: t("sample.mode.edit") },
            { value: "motion", label: t("sample.mode.motion") },
          ]}
        />
      ))}
      <Tabs defaultValue="how">
        <TabsList aria-label={t("sample.canvas.label")}>
          <TabsTrigger value="history">
            <FolderIcon aria-hidden="true" />
            {t("sample.tab.history")}
          </TabsTrigger>
          <TabsTrigger value="how">
            <BookOpenIcon aria-hidden="true" />
            {t("sample.tab.how")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <SegmentedControl
        density="row"
        label={t("sample.canvas.label")}
        value="list"
        onValueChange={() => undefined}
        items={[
          { value: "list", label: t("sample.view.list"), icon: <ListIcon /> },
          {
            value: "grid",
            label: t("sample.view.grid"),
            icon: <LayoutGridIcon />,
          },
        ]}
      />
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
      </span>
      <span className="flex items-center text-body">
        {t("sample.model")}
        <Badge kind="value">{t("sample.badge.value")}</Badge>
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
    states: [...interactionStates(() => <Buttons />), ...confirmStates],
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
    states: [...interactionStates(() => <Badges />), inlineChipState],
  },
]
