import { type AppListing, fixedCountOf, type Run } from "@rosesfield/contract"
import {
  SegmentedControl,
  type SegmentedItem,
} from "@rosesfield/ui/components/segmented-control"
import { useQuery } from "@tanstack/react-query"
import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { runQuery } from "@/api/queries"
import { tCatalog } from "@/copy/t"
import { AppHeader } from "@/screens/app/app-header"
import {
  AddInputsButton,
  ColumnFrame,
  useSheetOpen,
} from "@/screens/app/column-frame"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  type AppScreenState,
  type AppSeeds,
  noSeeds,
  useAppScreen,
} from "@/screens/app/use-app-screen"
import { ModeCanvas } from "@/studio/characters/mode-canvas"
import {
  firstModeOf,
  listingFor,
  modeOfRun,
} from "@/studio/characters/mode-listing"
import {
  AnglesPanel,
  RandomButton,
  TraitsPanel,
} from "@/studio/characters/mode-panels"
import { useTraitsModel } from "@/studio/characters/use-traits-model"
import type { Mode } from "../../../../../packages/catalog/src/characters/traits"

type ModeScreen = {
  listing: AppListing
  state: AppScreenState
  hosted: HostedState | undefined
}

const allModes: readonly Mode[] = ["traits", "angles"]

function useFixedCount(
  app: AppListing,
  form: AppForm,
  isHosted: boolean
): void {
  const { setForm } = form
  const count =
    fixedCountOf(app, form.values.inputs) ?? app.output.count.default
  const current = form.values.count
  useEffect(() => {
    if (!isHosted && current !== count) {
      setForm({ count })
    }
  }, [isHosted, count, current, setForm])
}

function useModeScreen(
  app: AppListing,
  mode: Mode,
  seeds: AppSeeds,
  onStarted: () => void
): ModeScreen {
  const listing = useMemo(() => listingFor(app, mode), [app, mode])
  const state = useAppScreen(listing, seeds, onStarted)
  const traits = useTraitsModel(
    listing,
    state.form,
    mode === "traits" ? state.hosted : undefined
  )
  const hosted = mode === "traits" ? traits : state.hosted
  useFixedCount(listing, state.form, (hosted?.fields ?? null) !== null)
  return { listing, state, hosted }
}

function ModePanel({
  mode,
  screen,
}: {
  mode: Mode
  screen: ModeScreen
}): ReactElement {
  const props = {
    app: screen.listing,
    form: screen.state.form,
    lastSeed: screen.state.lastSeed,
  }
  return mode === "traits" ? (
    <TraitsPanel {...props} hosted={screen.hosted} />
  ) : (
    <AnglesPanel {...props} />
  )
}

function ModeControl({
  mode,
  onChange,
}: {
  mode: Mode
  onChange: (mode: Mode) => void
}): ReactElement {
  const items: SegmentedItem<Mode>[] = allModes.map((value) => ({
    value,
    label: tCatalog(`characters.choice.mode.${value}`),
  }))
  const caption = tCatalog("characters.input.mode.label")
  return (
    <FieldFrame
      caption={caption}
      isOptional={false}
      note={null}
      problem={undefined}
    >
      <SegmentedControl
        items={items}
        value={mode}
        onValueChange={onChange}
        label={caption}
      />
    </FieldFrame>
  )
}

type FrameProps = {
  mode: Mode
  screen: ModeScreen
  shows: readonly Mode[]
  sheetClose: { current: () => void }
  control: ReactNode
  onUseInputs: (run: Run) => void
  hasHeader: boolean
}

function ModeFrame(props: FrameProps): ReactElement {
  const { mode, screen } = props
  const sheet = useSheetOpen()
  props.sheetClose.current = () => sheet[1](false)
  const panelProps = {
    app: screen.listing,
    form: screen.state.form,
    lastSeed: screen.state.lastSeed,
  }
  return (
    <ColumnFrame
      app={screen.listing}
      start={screen.state.start}
      onShortcut={screen.state.onShortcut}
      sheet={sheet}
      hasHeader={props.hasHeader}
      panel={
        <div className="flex flex-col gap-s4">
          {props.control}
          <ModePanel mode={mode} screen={screen} />
        </div>
      }
      footLeading={
        mode === "traits" ? <RandomButton {...panelProps} /> : undefined
      }
      canvas={(openInputs) => (
        <ModeCanvas
          app={screen.listing}
          mode={mode}
          shows={props.shows}
          onUseInputs={props.onUseInputs}
          emptyAction={<AddInputsButton onClick={openInputs} />}
        />
      )}
    />
  )
}

export function ModeView({
  app,
  mode,
  seeds,
}: {
  app: AppListing
  mode: Mode
  seeds: AppSeeds
}): ReactElement {
  const sheetClose = useRef<() => void>(() => undefined)
  const screen = useModeScreen(app, mode, seeds, () => sheetClose.current())
  return (
    <ModeFrame
      mode={mode}
      screen={screen}
      shows={[mode]}
      sheetClose={sheetClose}
      control={null}
      onUseInputs={screen.state.useInputs}
      hasHeader={false}
    />
  )
}

function CharactersStudio({
  app,
  first,
  seeds,
}: {
  app: AppListing
  first: Mode
  seeds: AppSeeds
}): ReactElement {
  const [mode, setMode] = useState<Mode>(first)
  const sheetClose = useRef<() => void>(() => undefined)
  const seedsFor = (one: Mode): AppSeeds =>
    one === first ? seeds : { ...seeds, from: undefined }
  const onStarted = (): void => sheetClose.current()
  const traits = useModeScreen(app, "traits", seedsFor("traits"), onStarted)
  const angles = useModeScreen(app, "angles", seedsFor("angles"), onStarted)
  const screenOf = (one: Mode): ModeScreen =>
    one === "traits" ? traits : angles
  return (
    <ModeFrame
      mode={mode}
      screen={screenOf(mode)}
      shows={allModes}
      sheetClose={sheetClose}
      control={<ModeControl mode={mode} onChange={setMode} />}
      hasHeader={true}
      onUseInputs={(run) => {
        const runMode = modeOfRun(run)
        const { useInputs: fillInputs } = screenOf(runMode).state
        setMode(runMode)
        fillInputs(run)
      }}
    />
  )
}

export function AppScreen({
  app,
  seeds = noSeeds,
}: StudioScreenProps): ReactElement {
  const from = useQuery({
    ...runQuery(seeds.from ?? ""),
    enabled: seeds.from !== undefined,
  })
  if (seeds.from !== undefined && from.isPending) {
    return <AppHeader app={app} />
  }
  return (
    <CharactersStudio
      app={app}
      first={firstModeOf(app, seeds, from.data?.run ?? null)}
      seeds={seeds}
    />
  )
}
