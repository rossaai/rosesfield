import type { AppListing } from "@rosesfield/contract"
import { PromptBlock } from "@rosesfield/ui/components/input-panel"
import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import { ModeStrip, ModeTab, Tabs } from "@rosesfield/ui/components/tabs"
import { type ReactElement, useMemo } from "react"
import { t, tCatalog } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { CatalogPicker, modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import { PresetCard } from "@/studio/video/preset-card"
import { shownPresets } from "@/studio/video/preset-samples"
import type { VideoScreen } from "@/studio/video/use-video-screen"
import { SoundChip, VideoChips } from "@/studio/video/video-chips"
import {
  kindsOf,
  type ModelKind,
  modelForKind,
  modelsOfKind,
  shownKindOf,
} from "@/studio/video/video-kind"
import {
  modelsOfTab,
  slotsOf,
  tabKeys,
  type VideoTab,
  videoTabs,
} from "@/studio/video/video-tabs"
import { VideoWells } from "@/studio/video/video-wells"

const kindKeys = {
  graph: "model.kind.graph",
  hosted: "model.kind.hosted",
} as const

function isVideoTab(value: unknown): value is VideoTab {
  return videoTabs.some((tab) => tab === value)
}

export function ModeTabs({ screen }: { screen: VideoScreen }): ReactElement {
  return (
    <Tabs
      value={screen.tab}
      onValueChange={(next) => {
        if (isVideoTab(next)) {
          screen.setTab(next)
        }
      }}
    >
      <ModeStrip aria-label={tCatalog("video.tabs.label")}>
        {videoTabs.map((one) => (
          <ModeTab key={one} value={one}>
            {tCatalog(tabKeys[one])}
          </ModeTab>
        ))}
      </ModeStrip>
    </Tabs>
  )
}

export function KindSwitch({
  hosted,
  kind,
}: {
  hosted: HostedState
  kind: ModelKind | null
}): ReactElement | null {
  const kinds = kindsOf(hosted.models)
  if (kind === null || kinds.length < 2) {
    return null
  }
  return (
    <div className="mb-2">
      <SegmentedControl
        density="composer"
        label={t("model.kind.label")}
        value={kind}
        items={kinds.map((one) => ({ value: one, label: t(kindKeys[one]) }))}
        onValueChange={(next) => {
          const id = modelForKind(hosted.models, hosted.chosen, next)
          if (id !== null) {
            hosted.choose(id)
          }
        }}
      />
    </div>
  )
}

function PromptPart({ screen }: { screen: VideoScreen }): ReactElement {
  const { prompt, presets, hosted, fields, state } = screen
  const words = presets.find((preset) => preset.value === prompt.move)?.words
  const problem = state.form.problems.get(prompt.name)
  const label = tCatalog("video.input.prompt.label")
  return (
    <div className="flex flex-col gap-1">
      <PromptBlock
        label={label}
        chips={
          <SoundChip
            form={state.form}
            fields={fields}
            isGraph={screen.isGraph}
            makesSound={
              hosted.chosen?.tags.some((one) => one.kind === "sound") === true
            }
          />
        }
      >
        <textarea
          aria-label={label}
          aria-invalid={problem === undefined ? undefined : true}
          placeholder={tCatalog("video.input.prompt.placeholder")}
          value={prompt.typed}
          onChange={(event) => prompt.setTyped(event.target.value)}
          className="min-h-0 w-full flex-1 resize-none bg-transparent text-body text-ink outline-none placeholder:text-ink-muted"
        />
      </PromptBlock>
      {words === undefined ? null : (
        <p className="px-1 text-label text-ink-muted">
          {tCatalog("video.preset.words", { words })}
        </p>
      )}
      {problem === undefined ? null : (
        <p role="alert" className="px-1 text-label text-bug-text">
          {t(problem.key, problem.values)}
        </p>
      )}
    </div>
  )
}

function Settings({
  app,
  screen,
}: {
  app: AppListing
  screen: VideoScreen
}): ReactElement {
  const { fields, state } = screen
  if (fields === null) {
    return (
      <AdvancedFields app={app} form={state.form} lastSeed={state.lastSeed} />
    )
  }
  return (
    <>
      <HostedFields fields={fields.required} form={state.form} />
      {fields.rest.length === 0 ? null : (
        <CollapsibleSection title={tCatalog("video.settings.more")}>
          <HostedFields fields={fields.rest} form={state.form} />
        </CollapsibleSection>
      )}
    </>
  )
}

export function VideoPanel({
  app,
  screen,
}: {
  app: AppListing
  screen: VideoScreen
}): ReactElement {
  const { hosted, tab, fields, state, prompt } = screen
  const tabHosted = useMemo(
    () => ({ ...hosted, models: modelsOfTab(hosted.models, tab) }),
    [hosted, tab]
  )
  const kind = shownKindOf(tabHosted.models, hosted.chosen)
  const kindHosted = useMemo(
    () => ({ ...tabHosted, models: modelsOfKind(tabHosted.models, kind) }),
    [tabHosted, kind]
  )
  const presets = useMemo(() => shownPresets(screen.presets), [screen.presets])
  return (
    <div className="flex flex-col gap-2">
      <PresetCard
        presets={presets}
        move={prompt.move}
        onMove={prompt.setMove}
        line={hosted.chosen === null ? "" : modelNameOf(hosted.chosen)}
      />
      <KindSwitch hosted={tabHosted} kind={kind} />
      {hosted.chosen === null ? null : (
        <VideoWells slots={slotsOf(fields, tab)} form={state.form} />
      )}
      <PromptPart screen={screen} />
      <CatalogPicker hosted={kindHosted} place="row" />
      {hosted.chosen === null ? null : (
        <>
          <VideoChips app={app} form={state.form} fields={fields} />
          <Settings app={app} screen={screen} />
        </>
      )}
    </div>
  )
}
