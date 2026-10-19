import type { AppListing } from "@rosesfield/contract"
import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { type ReactElement, useMemo, useState } from "react"
import { promptInputOf } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { AttachMenu } from "@/pieces/attach-menu"
import { LibraryPicker } from "@/pieces/library-picker"
import { BarChips, BarFrame } from "@/screens/app/bar-frame"
import { textOf } from "@/screens/app/fields/field-props"
import { inputPlaceholder } from "@/screens/app/fields/input-copy"
import { StartProblem } from "@/screens/app/generate-foot"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { type AppScreenState, useAppScreen } from "@/screens/app/use-app-screen"
import {
  GraphSettingChips,
  HostedSettingChips,
} from "@/studio/image/image-chips"
import { type ImageFields, imageFieldsOf } from "@/studio/image/image-fields"
import { useGraphRules } from "@/studio/image/image-model-settings"
import {
  GraphPanel,
  HostedPanel,
  InputsChip,
} from "@/studio/image/image-settings"
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

function Attach({ tray }: { tray: ReferenceTray }): ReactElement | null {
  const [isLibraryOpen, setLibraryOpen] = useState(false)
  if (tray.field === null) {
    return null
  }
  return (
    <>
      <AttachMenu
        label={t("bar.attach")}
        onUpload={tray.upload}
        onFromLibrary={() => setLibraryOpen(true)}
      />
      <LibraryPicker
        open={isLibraryOpen}
        onOpenChange={setLibraryOpen}
        kind="image"
        max={tray.field.max}
        title={t("bar.addMenu.fromLibrary")}
        onDone={tray.addAssets}
      />
    </>
  )
}

function Chips({
  app,
  state,
  fields,
}: {
  app: AppListing
  state: AppScreenState
  fields: ImageFields | null
}): ReactElement | null {
  const { hosted } = state
  if (hosted === undefined) {
    return null
  }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-s2">
      <CatalogPicker hosted={hosted} />
      {fields === null ? (
        <GraphSettingChips app={app} form={state.form} />
      ) : (
        <HostedSettingChips fields={fields} form={state.form} />
      )}
      <InputsChip app={app} state={state} fields={fields} />
    </span>
  )
}

function Settings({
  app,
  state,
  fields,
}: {
  app: AppListing
  state: AppScreenState
  fields: ImageFields | null
}): ReactElement | null {
  const { hosted } = state
  if (hosted === undefined) {
    return null
  }
  return fields === null ? (
    <GraphPanel app={app} state={state} hosted={hosted} />
  ) : (
    <HostedPanel hosted={hosted} fields={fields} form={state.form} />
  )
}

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const state = useAppScreen(app, seeds)
  const sheet = useState(false)
  const prompt = promptInputOf(app)
  const fields = useImageFields(state.hosted)
  const tray = useReferenceTray(fields?.references ?? null, state.form)
  useGraphRules(app, state.form, fields === null)
  return (
    <BarFrame
      app={app}
      hasRuns={state.hasRuns}
      onUseInputs={state.useInputs}
      sheet={sheet}
      price={state.start.price}
      settings={<Settings app={app} state={state} fields={fields} />}
      bar={
        <>
          <StartProblem start={state.start} />
          {tray.message === null ? null : (
            <p
              role="status"
              className="w-full max-w-prompt-max px-s3 text-label text-bug-text"
            >
              {tray.message}
            </p>
          )}
          <PromptBar
            value={
              prompt === null
                ? ""
                : textOf(state.form.values.inputs[prompt.name])
            }
            onValueChange={(value) => {
              if (prompt !== null) {
                state.form.setInput(prompt.name, value)
              }
            }}
            onSubmit={state.start.generate}
            label={t("home.prompt.label")}
            placeholder={
              prompt === null ? "" : (inputPlaceholder(app, prompt) ?? "")
            }
            submitLabel={t("run.generate")}
            removeLabel={t("bar.attachment.remove")}
            attachments={tray.attachments}
            onRemoveAttachment={tray.remove}
            leading={<Attach tray={tray} />}
            chips={
              <BarChips
                chips={<Chips app={app} state={state} fields={fields} />}
                onOpenSheet={() => sheet[1](true)}
              />
            }
            price={state.start.price === "" ? undefined : state.start.price}
            submitValue={state.start.priceValue}
            submitName={state.start.priceName ?? undefined}
            busy={state.start.isPending || tray.isUploading}
          />
        </>
      }
    />
  )
}
