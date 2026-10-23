import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { IconButton } from "@rosesfield/ui/components/button"
import { Chip } from "@rosesfield/ui/components/chip"
import { PromptBar } from "@rosesfield/ui/components/prompt-bar"
import { AtSignIcon, SlidersHorizontalIcon } from "lucide-react"
import { type ReactElement, useState } from "react"
import { characterInputOf, isAssetInput } from "@/catalog/app-facts"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import { AttachMenu } from "@/pieces/attach-menu"
import { CharacterPicker } from "@/pieces/character-picker"
import { LibraryPicker } from "@/pieces/library-picker"
import { useUploads } from "@/pieces/use-uploads"
import { aspectField, countField } from "@/screens/app/app-form"
import { SettingChip } from "@/screens/app/bar/setting-chip"
import { type BarTray, useBarTray } from "@/screens/app/bar/use-bar-tray"
import { BarChips, BarFrame, type BarPlace } from "@/screens/app/bar-frame"
import {
  inputCaption,
  inputNote,
  inputPlaceholder,
} from "@/screens/app/fields/input-copy"
import { StartProblem, submitPriceOf } from "@/screens/app/generate-foot"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { AdsModelChip, AdsModelSettings } from "@/studio/ads/ads-model-settings"
import { photoMaxOf, photoRoomOf, promptInputsOf } from "@/studio/ads/ads-rules"
import { type AdsScreenState, useAdsScreen } from "@/studio/ads/use-ads-screen"

const chips: readonly string[] = [aspectField, countField]

type BarProps = {
  app: AppListing
  state: AdsScreenState
  tray: BarTray
  onMessage: (message: string | null) => void
}

function usePhotoPicks({ app, state, tray, onMessage }: BarProps) {
  const uploads = useUploads()
  const device = useDevice()
  const fitting = <Item,>(picked: readonly Item[]): readonly Item[] => {
    const room = photoRoomOf(app, state.form.values.inputs)
    onMessage(
      picked.length > room
        ? t("field.asset.tooMany", { max: photoMaxOf(app) })
        : null
    )
    return picked.slice(0, room)
  }
  const addAssets = (ids: readonly string[]): void => {
    tray.addAssets(fitting(ids))
  }
  const upload = (): void => {
    const accept = app.inputs
      .filter(isAssetInput)
      .map((input) => `${input.type}/*`)
    void device
      .pickFiles({ accept, multiple: true })
      .then((files) => uploads.start(fitting(files)))
      .then((added) => tray.addAssets(added.map((asset) => asset.id)))
  }
  return { addAssets, upload }
}

function Leading(props: BarProps): ReactElement {
  const { app, state } = props
  const [isLibraryOpen, setLibraryOpen] = useState(false)
  const [isCharacterOpen, setCharacterOpen] = useState(false)
  const character = characterInputOf(app)
  const picks = usePhotoPicks(props)
  return (
    <>
      <AttachMenu
        form="menu"
        label={t("bar.attach")}
        onUpload={picks.upload}
        onFromLibrary={() => setLibraryOpen(true)}
      />
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
        onDone={picks.addAssets}
      />
    </>
  )
}

function Chips({
  app,
  state,
}: {
  app: AppListing
  state: AdsScreenState
}): ReactElement {
  return (
    <BarChips
      chips={
        <>
          <AdsModelChip app={app} state={state} chips={chips} />
          {chips.map((name) => (
            <SettingChip
              key={name}
              app={state.countApp}
              form={state.form}
              name={name}
            />
          ))}
        </>
      }
    />
  )
}

function InputsChip({ onOpen }: { onOpen: () => void }): ReactElement {
  return (
    <Chip icon={<SlidersHorizontalIcon />} onClick={onOpen}>
      {t("app.inputs.open")}
    </Chip>
  )
}

type BarPlacement = { place: BarPlace; onInputs: () => void }

function barChips(
  app: AppListing,
  state: AdsScreenState,
  placement: BarPlacement
): ReactElement | undefined {
  switch (placement.place) {
    case "phone":
      return <InputsChip onOpen={placement.onInputs} />
    case "sheet":
      return undefined
    case "dock":
      return <Chips app={app} state={state} />
  }
}

function Bar({
  app,
  state,
  placement,
}: {
  app: AppListing
  state: AdsScreenState
  placement: BarPlacement
}): ReactElement {
  const tray = useBarTray(app, state.form)
  const [photoMessage, setPhotoMessage] = useState<string | null>(null)
  const remove = (id: string): void => {
    setPhotoMessage(null)
    tray.remove(id)
  }
  const [prompt, secondLine] = promptInputsOf(app, state.kind)
  const note =
    prompt === undefined || state.kind !== "ad" ? null : inputNote(app, prompt)
  return (
    <div ref={state.bar} className="flex w-full flex-col items-center gap-s2">
      {note === null ? null : (
        <p className="text-caption text-ink-muted">{note}</p>
      )}
      {[photoMessage, state.message].map((message) =>
        message === null ? null : (
          <p key={message} role="alert" className="text-label text-bug-text">
            {message}
          </p>
        )
      )}
      <StartProblem start={state.start} />
      <PromptBar
        value={state.text}
        onValueChange={state.setText}
        onSubmit={state.start.generate}
        label={t("home.prompt.label")}
        placeholder={barPlaceholder(app, prompt, secondLine)}
        submitLabel={t("run.generate")}
        removeLabel={t("bar.attachment.remove")}
        attachments={tray.attachments}
        onRemoveAttachment={remove}
        leading={
          <Leading
            app={app}
            state={state}
            tray={tray}
            onMessage={setPhotoMessage}
          />
        }
        chips={barChips(app, state, placement)}
        {...(state.start.price === "" ? {} : { price: state.start.price })}
        {...submitPriceOf(state.start)}
        busy={state.start.isPending || tray.isUploading}
      />
    </div>
  )
}

function barPlaceholder(
  app: AppListing,
  prompt: InputDefinition | undefined,
  secondLine: InputDefinition | undefined
): string {
  if (prompt === undefined) {
    return ""
  }
  return secondLine === undefined
    ? (inputPlaceholder(app, prompt) ?? inputCaption(prompt))
    : inputCaption(prompt)
}

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const state = useAdsScreen(app, seeds)
  const sheet = useState(false)
  const [, setOpen] = sheet
  const onInputs = (): void => setOpen(true)
  return (
    <BarFrame
      app={app}
      onUseInputs={state.useInputs}
      sheet={sheet}
      phone="dock"
      settings={<AdsModelSettings app={app} state={state} chips={[]} />}
      bar={(place) => (
        <Bar app={app} state={state} placement={{ place, onInputs }} />
      )}
    />
  )
}
