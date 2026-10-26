import type { AppListing } from "@rosesfield/contract"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { type ReactElement, type ReactNode, useEffect, useRef } from "react"
import { t, tCatalog } from "@/copy/t"
import { countField } from "@/screens/app/app-form"
import { AppModelPicker } from "@/screens/app/bar/model-settings"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { textOf } from "@/screens/app/fields/field-props"
import { AppSettingsSection } from "@/screens/app/fields/setting-rows"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedSettings } from "@/screens/app/hosted/hosted-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import { appSettingsPlan } from "@/screens/app/settings-plan"
import { ReferenceWell } from "@/studio/storyboard/reference-well"
import { SceneList } from "@/studio/storyboard/scene-list"
import { formatFieldOf } from "@/studio/storyboard/storyboard-model"
import type { StoryboardState } from "@/studio/storyboard/use-storyboard-screen"
import {
  keyframeInput,
  lookMaxLength,
  sceneCountInput,
} from "../../../../../packages/catalog/src/storyboard/storyboard-inputs"

type PanelProps = {
  app: AppListing
  state: StoryboardState
}

function LookField({ state }: { state: StoryboardState }): ReactElement {
  const field = useRef<HTMLTextAreaElement>(null)
  const { register } = state
  useEffect(() => {
    register("look")(() => field.current?.focus())
  }, [register])
  const text = textOf(state.form.values.inputs.look)
  return (
    <FieldFrame
      caption={tCatalog("storyboard.input.look.label")}
      isOptional={false}
      note={
        text.length > lookMaxLength * 0.8
          ? t("field.prompt.count", { count: text.length, max: lookMaxLength })
          : null
      }
      problem={undefined}
      message={state.messages.get("look") ?? null}
    >
      <Textarea
        ref={field}
        value={text}
        placeholder={tCatalog("storyboard.input.look.placeholder")}
        onChange={(event) => state.form.setInput("look", event.target.value)}
        className="max-w-none"
      />
    </FieldFrame>
  )
}

function ModelField({ app, state }: PanelProps): ReactElement | null {
  return state.model.isTaskApp || state.model.isLoading ? (
    <CatalogPicker hosted={state.model} place="row" />
  ) : (
    <AppModelPicker app={app} form={state.form} place="row" />
  )
}

const placedInputs: readonly string[] = [
  sceneCountInput,
  keyframeInput,
  countField,
]

function Settings({ app, state }: PanelProps): ReactNode {
  const fields = state.model.chosen?.form ?? null
  if (fields === null) {
    return (
      <AppSettingsSection
        app={app}
        form={state.form}
        lastSeed={state.lastSeed}
        plan={appSettingsPlan(app, placedInputs)}
      />
    )
  }
  const format = formatFieldOf(fields)
  return (
    <>
      <HostedSettings
        fields={format === null ? [] : [format]}
        form={state.form}
      />
      <AdvancedFields app={app} form={state.form} lastSeed={state.lastSeed} />
    </>
  )
}

export function StoryboardPanel({ app, state }: PanelProps): ReactElement {
  return (
    <div className="flex flex-col gap-s4">
      <SceneList state={state} />
      <ReferenceWell state={state} />
      <LookField state={state} />
      <ModelField app={app} state={state} />
      <Settings app={app} state={state} />
    </div>
  )
}
