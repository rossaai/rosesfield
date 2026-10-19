import type { AppListing } from "@rosesfield/contract"
import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { type ReactElement, useState } from "react"
import { promptInputOf } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { AttachMenu } from "@/pieces/attach-menu"
import { LibraryPicker } from "@/pieces/library-picker"
import { aspectField, type FieldProblem } from "@/screens/app/app-form"
import { SettingChip } from "@/screens/app/bar/setting-chip"
import { type BarTray, useBarTray } from "@/screens/app/bar/use-bar-tray"
import { BarChips, BarFrame } from "@/screens/app/bar-frame"
import { listOf, textOf } from "@/screens/app/fields/field-props"
import { inputPlaceholder } from "@/screens/app/fields/input-copy"
import { StartProblem } from "@/screens/app/generate-foot"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import type { AppForm } from "@/screens/app/use-app-form"
import { type AppScreenState, useAppScreen } from "@/screens/app/use-app-screen"
import { useAttachedFacts } from "@/studio/video/use-attached-facts"
import {
  useInputRules,
  VideoModelChip,
  VideoModelSettings,
} from "@/studio/video/video-model-settings"
import { clipName, lengthName, rulesOf } from "@/studio/video/video-rules"

const chips: readonly string[] = [aspectField, lengthName, "cameraMove"]

function shownChips(app: AppListing, form: AppForm): string[] {
  const rules = rulesOf(app, form.values.inputs)
  const hasClip = listOf(form.values.inputs[clipName]).length > 0
  return chips.filter((name) => {
    if (name === aspectField) {
      return true
    }
    return rules.has(name) && !(name === lengthName && hasClip)
  })
}

function ClipProblem({
  problem,
}: {
  problem: FieldProblem | undefined
}): ReactElement | null {
  return problem === undefined ? null : (
    <p role="alert" className="text-label text-bug-text">
      {t(problem.key, problem.values)}
    </p>
  )
}

function Attach({ tray }: { tray: BarTray }): ReactElement | null {
  const [isLibraryOpen, setLibraryOpen] = useState(false)
  if (!tray.acceptsAssets) {
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
        kind={null}
        max={16}
        title={t("bar.addMenu.fromLibrary")}
        onDone={tray.addAssets}
      />
    </>
  )
}

function VideoChips({
  app,
  state,
  onOpenSheet,
}: {
  app: AppListing
  state: AppScreenState
  onOpenSheet: () => void
}): ReactElement {
  return (
    <BarChips
      chips={
        <>
          <VideoModelChip app={app} state={state} chips={chips} />
          {shownChips(app, state.form).map((name) => (
            <SettingChip key={name} app={app} form={state.form} name={name} />
          ))}
        </>
      }
      onOpenSheet={onOpenSheet}
    />
  )
}

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const state = useAppScreen(app, seeds)
  const sheet = useState(false)
  const tray = useBarTray(app, state.form)
  const prompt = promptInputOf(app)
  useInputRules(app, state.form)
  const clipProblem = useAttachedFacts(app, state.form)
  return (
    <BarFrame
      app={app}
      hasRuns={state.hasRuns}
      onUseInputs={state.useInputs}
      sheet={sheet}
      price={state.start.price}
      settings={<VideoModelSettings app={app} state={state} chips={[]} />}
      bar={
        <>
          <StartProblem start={state.start} />
          <ClipProblem problem={clipProblem} />
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
              <VideoChips
                app={app}
                state={state}
                onOpenSheet={() => sheet[1](true)}
              />
            }
            price={state.start.price}
            busy={state.start.isPending || tray.isUploading}
          />
        </>
      }
    />
  )
}
