import { extendApp } from "@rosesfield/catalog/video"
import type { AppListing } from "@rosesfield/contract"
import { PromptBlock } from "@rosesfield/ui/components/input-panel"
import { SegmentedControl } from "@rosesfield/ui/components/segmented-control"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import { useNavigate } from "@tanstack/react-router"
import { type ReactElement, useMemo, useRef } from "react"
import { t, tCatalog } from "@/copy/t"
import { CatalogPicker, modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import { pickerModelsOf } from "@/studio/video/picker-models"
import { PresetCard } from "@/studio/video/preset-card"
import { shownPresets } from "@/studio/video/preset-samples"
import type { VideoScreen } from "@/studio/video/use-video-screen"
import { SoundChip, VideoChips } from "@/studio/video/video-chips"
import {
  slotsOf,
  tabKeys,
  type VideoTab,
  videoTabs,
} from "@/studio/video/video-tabs"
import { ElementsChip, VideoWells } from "@/studio/video/video-wells"
import type { VideoEditMode } from "@/studio/video-edit/video-edit-modes"

function isVideoTab(value: unknown): value is VideoTab {
  return videoTabs.some((tab) => tab === value)
}

export function ModeTabs({
  screen,
}: {
  screen: Pick<VideoScreen, "tab" | "setTab">
}): ReactElement {
  return (
    <Tabs
      value={screen.tab}
      onValueChange={(next) => {
        if (isVideoTab(next)) {
          screen.setTab(next)
        }
      }}
    >
      <TabsList aria-label={tCatalog("video.tabs.label")}>
        {videoTabs.map((one) => (
          <TabsTrigger key={one} value={one}>
            {tCatalog(tabKeys[one])}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

type MakeChoice = "video" | "extend"

const extendTab: VideoEditMode = "extend"

export function MakeSwitch({
  onExtend,
}: {
  onExtend: () => void
}): ReactElement {
  const isByArrow = useRef(false)
  return (
    <div
      data-slot="make-switch"
      className="mb-2"
      onKeyDownCapture={(event) => {
        isByArrow.current = event.key.startsWith("Arrow")
      }}
      onClickCapture={(event) => {
        if (!(event.target instanceof HTMLInputElement)) {
          isByArrow.current = false
        }
      }}
    >
      <SegmentedControl<MakeChoice>
        density="composer"
        label={tCatalog("videoEdit.input.mode.label")}
        value="video"
        items={[
          { value: "video", label: t("kind.video") },
          { value: "extend", label: tCatalog("videoEdit.choice.mode.extend") },
        ]}
        onValueChange={(next) => {
          if (next === "extend" && !isByArrow.current) {
            onExtend()
          }
        }}
      />
    </div>
  )
}

function PromptPart({ screen }: { screen: VideoScreen }): ReactElement {
  const { prompt, presets, hosted, fields, state, tab } = screen
  const words = presets.find((preset) => preset.value === prompt.move)?.words
  const problem = state.form.problems.get(prompt.name)
  const label = tCatalog("video.input.prompt.label")
  return (
    <div className="flex flex-col gap-1">
      <PromptBlock
        label={label}
        chips={
          <>
            {hosted.chosen === null ? null : (
              <ElementsChip slots={slotsOf(fields, tab)} form={state.form} />
            )}
            <SoundChip
              form={state.form}
              fields={fields}
              isGraph={screen.isGraph}
              makesSound={
                hosted.chosen?.tags.some((one) => one.kind === "sound") === true
              }
            />
          </>
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
        <HostedFields fields={fields.rest} form={state.form} />
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
    () => ({ ...hosted, models: pickerModelsOf(hosted.models, tab, app) }),
    [hosted, tab, app]
  )
  const presets = useMemo(() => shownPresets(screen.presets), [screen.presets])
  const navigate = useNavigate()
  return (
    <div data-slot="video-parts" className="flex flex-1 flex-col gap-2">
      <PresetCard
        presets={presets}
        move={prompt.move}
        onMove={prompt.setMove}
        line={hosted.chosen === null ? "" : modelNameOf(hosted.chosen)}
      />
      <MakeSwitch
        onExtend={() =>
          void navigate({
            to: "/apps/$appId",
            params: { appId: extendApp },
            search: { mode: extendTab },
          })
        }
      />
      {hosted.chosen === null ? null : (
        <VideoWells slots={slotsOf(fields, tab)} form={state.form} />
      )}
      <PromptPart screen={screen} />
      <CatalogPicker hosted={tabHosted} place="row" />
      {hosted.chosen === null ? null : (
        <>
          <VideoChips app={app} form={state.form} fields={fields} />
          <Settings app={app} screen={screen} />
        </>
      )}
    </div>
  )
}
