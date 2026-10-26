import type { AppListing } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { AtSignIcon } from "lucide-react"
import { type ReactElement, useState } from "react"
import { characterInputOf, promptInputOf } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { AttachMenu } from "@/pieces/attach-menu"
import { CharacterPicker } from "@/pieces/character-picker"
import { LibraryPicker } from "@/pieces/library-picker"
import { BarModelChip, ModelSettings } from "@/screens/app/bar/model-settings"
import { SettingChip } from "@/screens/app/bar/setting-chip"
import { type BarTray, useBarTray } from "@/screens/app/bar/use-bar-tray"
import { BarChips, BarFrame } from "@/screens/app/bar-frame"
import { textOf } from "@/screens/app/fields/field-props"
import { promptPlaceholderOf } from "@/screens/app/fields/input-copy"
import { StartProblem, submitPriceOf } from "@/screens/app/generate-foot"
import { HostedChips } from "@/screens/app/hosted/hosted-chips"
import { TaskPanel } from "@/screens/app/hosted/task-panel"
import {
  type AppScreenState,
  type AppSeeds,
  noSeeds,
  useAppScreen,
} from "@/screens/app/use-app-screen"

type BarAppScreenProps = {
  app: AppListing
  chips: readonly string[]
  seeds?: AppSeeds
}

function BarLeading({
  app,
  state,
  tray,
}: {
  app: AppListing
  state: AppScreenState
  tray: BarTray
}): ReactElement {
  const [isLibraryOpen, setLibraryOpen] = useState(false)
  const [isCharacterOpen, setCharacterOpen] = useState(false)
  const character = characterInputOf(app)
  return (
    <>
      {tray.acceptsAssets ? (
        <AttachMenu
          form="menu"
          label={t("bar.attach")}
          onUpload={tray.upload}
          onFromLibrary={() => setLibraryOpen(true)}
        />
      ) : null}
      {character === null ? null : (
        <CharacterPicker
          open={isCharacterOpen}
          onOpenChange={setCharacterOpen}
          onPick={(id) => state.form.setInput(character.name, [id])}
          trigger={
            <IconButton label={t("bar.mention")} size="dense">
              <AtSignIcon aria-hidden="true" />
            </IconButton>
          }
        />
      )}
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

function BarModelChips({
  app,
  state,
  chips,
}: {
  app: AppListing
  state: AppScreenState
  chips: readonly string[]
}): ReactElement {
  const { hosted } = state
  const formats =
    hosted?.fields === null || hosted?.fields === undefined
      ? chips.map((name) => (
          <SettingChip key={name} app={app} form={state.form} name={name} />
        ))
      : null
  return (
    <>
      {hosted?.isTaskApp === true ? (
        <HostedChips
          hosted={hosted}
          form={state.form}
          output={app.output.kind}
          formats={formats}
        />
      ) : (
        <BarModelChip app={app} state={state} chips={chips} formats={formats} />
      )}
    </>
  )
}

function BarSettings({
  app,
  state,
}: {
  app: AppListing
  state: AppScreenState
}): ReactElement {
  const { hosted } = state
  if (hosted?.isTaskApp !== true) {
    return <ModelSettings app={app} state={state} chips={[]} />
  }
  return (
    <TaskPanel
      app={app}
      form={state.form}
      hosted={hosted}
      skipPrompt
      graphPanel={(graphApp, model) => (
        <div className="flex flex-col gap-s4">
          {model}
          <ModelSettings app={graphApp} state={state} chips={[]} />
        </div>
      )}
    />
  )
}

export function BarAppScreen({
  app,
  chips,
  seeds = noSeeds,
}: BarAppScreenProps): ReactElement {
  const state = useAppScreen(app, seeds)
  const sheet = useState(false)
  const tray = useBarTray(app, state.form)
  const prompt = promptInputOf(app)
  return (
    <BarFrame
      app={app}
      onUseInputs={state.useInputs}
      sheet={sheet}
      settings={<BarSettings app={app} state={state} />}
      bar={(place) => (
        <>
          <StartProblem start={state.start} />
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
              prompt === null ? "" : promptPlaceholderOf(app, prompt)
            }
            submitLabel={t("run.generate")}
            removeLabel={t("bar.attachment.remove")}
            attachments={tray.attachments}
            slots={tray.slots}
            onRemoveAttachment={tray.remove}
            leading={<BarLeading app={app} state={state} tray={tray} />}
            chips={
              place === "sheet" ? undefined : (
                <BarChips
                  chips={
                    <BarModelChips app={app} state={state} chips={chips} />
                  }
                />
              )
            }
            {...submitPriceOf(state.start)}
            busy={state.start.isPending || tray.isUploading}
          />
        </>
      )}
    />
  )
}
