import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { type ReactElement, useState } from "react"
import { promptInputOf } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { AttachMenu } from "@/pieces/attach-menu"
import { useAssetThumbs } from "@/pieces/attachment-thumbs"
import { LibraryPicker } from "@/pieces/library-picker"
import { aspectField, countField } from "@/screens/app/app-form"
import { BarModelChip } from "@/screens/app/bar/model-settings"
import { SettingChip } from "@/screens/app/bar/setting-chip"
import { BarChips } from "@/screens/app/bar-frame"
import { textOf } from "@/screens/app/fields/field-props"
import { inputPlaceholder } from "@/screens/app/fields/input-copy"
import { StartProblem, submitPriceOf } from "@/screens/app/generate-foot"
import { HostedChips } from "@/screens/app/hosted/hosted-chips"
import { appliedApp } from "@/studio/edit/edit-form"
import type { EditToolState } from "@/studio/edit/use-edit-tool"

function PhotoAttach({ state }: { state: EditToolState }): ReactElement {
  const [isLibraryOpen, setLibraryOpen] = useState(false)
  return (
    <>
      <AttachMenu
        label={t("bar.attach")}
        onUpload={state.photo.upload}
        onFromLibrary={() => setLibraryOpen(true)}
      />
      <LibraryPicker
        open={isLibraryOpen}
        onOpenChange={setLibraryOpen}
        kind="image"
        max={1}
        title={t("bar.addMenu.fromLibrary")}
        onDone={state.photo.addFromLibrary}
      />
    </>
  )
}

export function ToolChips({ state }: { state: EditToolState }): ReactElement {
  const { app, hosted, form } = state
  const formats = (
    <>
      {state.chips.map((name) => (
        <SettingChip key={name} app={app} form={form} name={name} />
      ))}
      <SettingChip app={app} form={form} name={countField} />
    </>
  )
  return hosted?.isTaskApp === true ? (
    <HostedChips
      hosted={hosted}
      form={form}
      output={app.output.kind}
      formats={formats}
    />
  ) : (
    <BarModelChip
      app={appliedApp(app, form.values.inputs)}
      state={state}
      chips={[...state.chips, countField, aspectField]}
      formats={formats}
    />
  )
}

function promptNameOf(state: EditToolState): string | null {
  const fields = state.hosted?.fields ?? null
  if (fields !== null) {
    return fields.find((field) => field.kind === "prompt")?.name ?? null
  }
  return promptInputOf(state.app)?.name ?? null
}

function placeholderOf(state: EditToolState): string {
  const prompt = promptInputOf(state.app)
  return prompt === null ? "" : (inputPlaceholder(state.app, prompt) ?? "")
}

function messageOf(state: EditToolState): string | null {
  const [problem] = state.form.problems.values()
  if (state.photo.message !== null || problem === undefined) {
    return state.photo.message
  }
  return t(problem.key, problem.values)
}

function PhotoMessage({ text }: { text: string | null }): ReactElement | null {
  return text === null ? null : (
    <p
      role="status"
      data-slot="edit-photo-message"
      className="w-full max-w-prompt-max px-s3 text-label text-bug-text"
    >
      {text}
    </p>
  )
}

export function EditBar({ state }: { state: EditToolState }): ReactElement {
  const { form, photo } = state
  const prompt = promptNameOf(state)
  const ids =
    photo.photo === null ? photo.extras : [photo.photo, ...photo.extras]
  const attachments = useAssetThumbs(ids)
  return (
    <>
      <StartProblem start={state.start} />
      <PhotoMessage text={messageOf(state)} />
      <PromptBar
        value={prompt === null ? "" : textOf(form.values.inputs[prompt])}
        onValueChange={(value) => {
          if (prompt !== null) {
            form.setInput(prompt, value)
          }
        }}
        onSubmit={state.start.generate}
        label={t("home.prompt.label")}
        placeholder={placeholderOf(state)}
        submitLabel={t("run.generate")}
        removeLabel={t("bar.attachment.remove")}
        attachments={attachments}
        onRemoveAttachment={photo.remove}
        leading={<PhotoAttach state={state} />}
        chips={<BarChips chips={<ToolChips state={state} />} />}
        {...submitPriceOf(state.start)}
        busy={state.start.isPending || photo.isUploading}
      />
    </>
  )
}
