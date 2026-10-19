import type { AppListing } from "@rosesfield/contract"
import { Tabs, TabsList, TabsTrigger } from "@rosesfield/ui/components/tabs"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { type ReactElement, useId, useMemo } from "react"
import { tCatalog } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import { ModelRow } from "@/studio/video/model-row"
import { PresetCard } from "@/studio/video/preset-card"
import { shownPresets } from "@/studio/video/preset-samples"
import type { VideoScreen } from "@/studio/video/use-video-screen"
import { SoundSwitch, VideoChips } from "@/studio/video/video-chips"
import {
  modelsOfTab,
  slotsOf,
  tabKeys,
  type VideoTab,
  videoTabs,
} from "@/studio/video/video-tabs"
import { VideoWells } from "@/studio/video/video-wells"

function isVideoTab(value: unknown): value is VideoTab {
  return videoTabs.some((tab) => tab === value)
}

function PromptWell({ screen }: { screen: VideoScreen }): ReactElement {
  const id = useId()
  const { prompt, presets } = screen
  const words = presets.find((preset) => preset.value === prompt.move)?.words
  return (
    <FieldFrame
      caption={tCatalog("video.input.prompt.label")}
      isOptional={false}
      note={
        words === undefined ? null : tCatalog("video.preset.words", { words })
      }
      problem={screen.state.form.problems.get(prompt.name)}
    >
      <Textarea
        id={id}
        aria-label={tCatalog("video.input.prompt.label")}
        placeholder={tCatalog("video.input.prompt.placeholder")}
        value={prompt.typed}
        onChange={(event) => prompt.setTyped(event.target.value)}
      />
    </FieldFrame>
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
  const presets = useMemo(() => shownPresets(screen.presets), [screen.presets])
  return (
    <div className="flex flex-col gap-s4">
      <Tabs
        value={tab}
        onValueChange={(next) => {
          if (isVideoTab(next)) {
            screen.setTab(next)
          }
        }}
      >
        <TabsList
          aria-label={tCatalog("video.tabs.label")}
          className="flex-wrap overflow-visible"
        >
          {videoTabs.map((one) => (
            <TabsTrigger key={one} value={one}>
              {tCatalog(tabKeys[one])}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <PresetCard
        presets={presets}
        move={prompt.move}
        onMove={prompt.setMove}
      />
      {hosted.chosen === null ? null : (
        <VideoWells slots={slotsOf(fields, tab)} form={state.form} />
      )}
      <PromptWell screen={screen} />
      <ModelRow hosted={tabHosted} />
      {hosted.chosen === null ? null : (
        <>
          <VideoChips app={app} form={state.form} fields={fields} />
          <SoundSwitch
            form={state.form}
            fields={fields}
            isGraph={screen.isGraph}
            makesSound={
              hosted.chosen?.tags.some((one) => one.kind === "sound") === true
            }
          />
          <Settings app={app} screen={screen} />
        </>
      )}
    </div>
  )
}
