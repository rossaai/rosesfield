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
import { ModelChip, ModelSettings } from "@/screens/app/bar/model-settings"
import { SettingChip } from "@/screens/app/bar/setting-chip"
import { type BarTray, useBarTray } from "@/screens/app/bar/use-bar-tray"
import { BarChips, BarFrame } from "@/screens/app/bar-frame"
import { textOf } from "@/screens/app/fields/field-props"
import { inputPlaceholder } from "@/screens/app/fields/input-copy"
import { StartProblem } from "@/screens/app/generate-foot"
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
      hasRuns={state.hasRuns}
      onUseInputs={state.useInputs}
      sheet={sheet}
      price={state.start.price}
      settings={<ModelSettings app={app} state={state} chips={[]} />}
      bar={
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
              prompt === null ? "" : (inputPlaceholder(app, prompt) ?? "")
            }
            submitLabel={t("run.generate")}
            removeLabel={t("bar.attachment.remove")}
            attachments={tray.attachments}
            onRemoveAttachment={tray.remove}
            leading={<BarLeading app={app} state={state} tray={tray} />}
            chips={
              <BarChips
                chips={
                  <>
                    <ModelChip app={app} state={state} chips={chips} />
                    {chips.map((name) => (
                      <SettingChip
                        key={name}
                        app={app}
                        form={state.form}
                        name={name}
                      />
                    ))}
                  </>
                }
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
