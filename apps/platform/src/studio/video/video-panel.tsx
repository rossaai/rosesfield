import type { AppListing } from "@rosesfield/contract"
import { PromptBlock } from "@rosesfield/ui/components/input-panel"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import { type ReactElement, useMemo } from "react"
import { t, tCatalog } from "@/copy/t"
import { CatalogPicker, modelNameOf } from "@/screens/app/hosted/catalog-picker"
import { pickerModelsOf } from "@/studio/video/picker-models"
import { PresetCard } from "@/studio/video/preset-card"
import { shownPresets } from "@/studio/video/preset-samples"
import type { VideoScreen } from "@/studio/video/use-video-screen"
import { VideoSettings } from "@/studio/video/video-chips"
import {
  slotsOf,
  tabKeys,
  type VideoTab,
  videoTabs,
} from "@/studio/video/video-tabs"
import { VideoWells } from "@/studio/video/video-wells"

const tabLabelKeys: Readonly<Record<VideoTab, string>> = {
  ...tabKeys,
  "text-image": "shell.area.image",
}

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
            {tCatalog(tabLabelKeys[one])}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

const cameraMoveInput = "cameraMove"

function PromptPart({ screen }: { screen: VideoScreen }): ReactElement {
  const { prompt, presets, state } = screen
  const words = presets.find((preset) => preset.value === prompt.move)?.words
  const problem = state.form.problems.get(prompt.name)
  const label = tCatalog("video.input.prompt.label")
  return (
    <div className="flex flex-col gap-1">
      <PromptBlock label={label}>
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
  return (
    <div data-slot="video-parts" className="flex flex-1 flex-col gap-s4">
      <PresetCard
        presets={presets}
        move={prompt.move}
        onMove={prompt.setMove}
        line={hosted.chosen === null ? "" : modelNameOf(hosted.chosen)}
      />
      {hosted.chosen === null ? null : (
        <VideoWells slots={slotsOf(fields, tab)} form={state.form} />
      )}
      <PromptPart screen={screen} />
      <CatalogPicker hosted={tabHosted} place="row" />
      {hosted.chosen === null ? null : (
        <VideoSettings
          app={app}
          form={state.form}
          fields={fields}
          lastSeed={state.lastSeed}
          placed={[cameraMoveInput]}
        />
      )}
    </div>
  )
}
