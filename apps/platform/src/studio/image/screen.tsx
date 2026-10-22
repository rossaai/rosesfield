import type { AppListing } from "@rosesfield/contract"
import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { type ReactElement, useMemo, useState } from "react"
import { promptInputOf } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { AttachMenu } from "@/pieces/attach-menu"
import { LibraryPicker } from "@/pieces/library-picker"
import { BarChips, BarFrame, type BarPlace } from "@/screens/app/bar-frame"
import { textOf } from "@/screens/app/fields/field-props"
import { inputPlaceholder } from "@/screens/app/fields/input-copy"
import { StartProblem, submitPriceOf } from "@/screens/app/generate-foot"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppScreenState, useAppScreen } from "@/screens/app/use-app-screen"
import { barMessageOf } from "@/studio/image/bar-message"
import {
  GraphSettingChips,
  HostedSettingChips,
} from "@/studio/image/image-chips"
import {
  type ImageFields,
  imageFieldsOf,
  isGraphModel,
} from "@/studio/image/image-fields"
import { useGraphRules } from "@/studio/image/image-model-settings"
import {
  graphReferencesOf,
  referenceModelOf,
} from "@/studio/image/image-references"
import {
  GraphPanel,
  HostedPanel,
  ModelPopover,
} from "@/studio/image/image-settings"
import { useCharacterReferences } from "@/studio/image/use-character-references"
import { useHostedDefaults } from "@/studio/image/use-hosted-defaults"
import {
  type ReferenceTray,
  useReferenceTray,
} from "@/studio/image/use-reference-tray"

function useImageFields(hosted: HostedState | undefined): ImageFields | null {
  const fields = hosted?.fields ?? null
  return useMemo(
    () => (fields === null ? null : imageFieldsOf(fields)),
    [fields]
  )
}

function Attach({ tray }: { tray: ReferenceTray }): ReactElement {
  const [isLibraryOpen, setLibraryOpen] = useState(false)
  return (
    <>
      <AttachMenu
        label={t("bar.attach")}
        disabled={tray.target === null}
        onUpload={tray.upload}
        onFromLibrary={() => setLibraryOpen(true)}
      />
      {tray.target === null ? null : (
        <LibraryPicker
          open={isLibraryOpen}
          onOpenChange={setLibraryOpen}
          kind="image"
          max={tray.target.max}
          title={t("bar.addMenu.fromLibrary")}
          onDone={tray.addAssets}
        />
      )}
    </>
  )
}

function useImageTray(
  app: AppListing,
  state: AppScreenState,
  fields: ImageFields | null,
  isGraph: boolean
): ReferenceTray {
  const model = textOf(state.form.values.inputs.model)
  const hosted = state.hosted
  const field =
    fields?.references ?? (isGraph ? graphReferencesOf(app, model) : null)
  const target =
    hosted === undefined ? null : referenceModelOf(app, hosted.models)
  const targetField = target === null ? null : graphReferencesOf(app, target)
  const fallback =
    field !== null || target === null || targetField === null
      ? null
      : { field: targetField, choose: () => hosted?.choose(target) }
  return useReferenceTray(field, state.form, fallback)
}

type ViewProps = {
  app: AppListing
  state: AppScreenState
  fields: ImageFields | null
  isGraph: boolean
}

function Chips({
  app,
  state,
  fields,
  isGraph,
}: ViewProps): ReactElement | null {
  const { hosted } = state
  if (hosted === undefined) {
    return null
  }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-s2">
      <ModelPopover
        app={app}
        state={state}
        hosted={hosted}
        fields={fields}
        isGraph={isGraph}
      />
      {isGraph ? (
        <GraphSettingChips app={app} form={state.form} />
      ) : fields === null ? null : (
        <HostedSettingChips app={app} fields={fields} form={state.form} />
      )}
    </span>
  )
}

function Settings({
  app,
  state,
  fields,
  isGraph,
}: ViewProps): ReactElement | null {
  const { hosted } = state
  if (hosted === undefined) {
    return null
  }
  return isGraph ? (
    <GraphPanel app={app} state={state} hosted={hosted} />
  ) : (
    <HostedPanel app={app} hosted={hosted} fields={fields} form={state.form} />
  )
}

function BarMessage({ text }: { text: string | null }): ReactElement | null {
  return text === null ? null : (
    <p
      role="status"
      className="w-full max-w-prompt-max px-s3 text-label text-bug-text"
    >
      {text}
    </p>
  )
}

type BarProps = ViewProps & {
  tray: ReferenceTray
  place: BarPlace
}

function ImageBar({
  app,
  state,
  fields,
  isGraph,
  tray,
  place,
}: BarProps): ReactElement {
  const prompt = promptInputOf(app)
  return (
    <PromptBar
      value={
        prompt === null ? "" : textOf(state.form.values.inputs[prompt.name])
      }
      onValueChange={(value) => {
        if (prompt !== null) {
          state.form.setInput(prompt.name, value)
        }
      }}
      onSubmit={state.start.generate}
      label={t("home.prompt.label")}
      placeholder={prompt === null ? "" : (inputPlaceholder(app, prompt) ?? "")}
      submitLabel={t("run.generate")}
      removeLabel={t("bar.attachment.remove")}
      attachments={tray.attachments}
      onRemoveAttachment={tray.remove}
      leading={<Attach tray={tray} />}
      chips={
        place === "sheet" ? undefined : (
          <BarChips
            chips={
              <Chips
                app={app}
                state={state}
                fields={fields}
                isGraph={isGraph}
              />
            }
          />
        )
      }
      {...submitPriceOf(state.start)}
      busy={state.start.isPending || tray.isUploading}
    />
  )
}

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const state = useAppScreen(app, seeds)
  const sheet = useState(false)
  const fields = useImageFields(state.hosted)
  const isGraph = isGraphModel(textOf(state.form.values.inputs.model))
  const tray = useImageTray(app, state, fields, isGraph)
  useGraphRules(app, state.form)
  useHostedDefaults(state.form, state.hosted?.fields ?? null)
  useCharacterReferences(seeds.use, state.form, tray)
  const problems = state.form.problems
  const view = { app, state, fields, isGraph }
  return (
    <BarFrame
      app={app}
      onUseInputs={state.useInputs}
      sheet={sheet}
      settings={<Settings {...view} />}
      bar={(place) => (
        <>
          <StartProblem start={state.start} />
          <BarMessage
            text={
              tray.message ??
              barMessageOf(problems, app, state.hosted?.fields ?? null)
            }
          />
          <ImageBar {...view} tray={tray} place={place} />
        </>
      )}
    />
  )
}
