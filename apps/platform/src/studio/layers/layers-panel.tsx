import type { InputDefinition } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Slider } from "@rosesfield/ui/components/slider"
import type { ReactElement, ReactNode } from "react"
import { tCatalog } from "@/copy/t"
import { NumberStepper } from "@/pieces/number-stepper"
import { aspectField } from "@/screens/app/app-form"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { InputField } from "@/screens/app/fields/input-field"
import {
  AdvancedSection,
  AppSettingRow,
  settingId,
} from "@/screens/app/fields/setting-rows"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import {
  type AppSetting,
  appSettingsPlan,
  isSettingInput,
} from "@/screens/app/settings-plan"
import {
  isCountShown,
  isGraphModel,
  shownFieldsOf,
} from "@/studio/layers/layers-models"
import {
  bodyAppFor,
  countInput,
  countRangeOf,
  layerCountOf,
  layerInput,
  modeInput,
  shownInputsOf,
  sourceInput,
} from "@/studio/layers/layers-modes"
import { SourceField } from "@/studio/layers/source-field"
import type { LayersState } from "@/studio/layers/use-layers-screen"

function PanelField({
  state,
  input,
}: {
  state: LayersState
  input: InputDefinition
}): ReactElement | null {
  const { form } = state
  const props = {
    app: state.formApp,
    input,
    value: form.values.inputs[input.name],
    problem: form.problems.get(input.name),
    onChange: (value: (typeof form.values.inputs)[string]) =>
      form.setInput(input.name, value),
    register: (focus: () => void) => {
      form.register(input.name, focus)
      if (input.name === sourceInput) {
        state.focusSource.current = focus
      }
    },
  }
  if (input.name === sourceInput) {
    return <SourceField {...props} onSize={() => undefined} />
  }
  return <InputField {...props} />
}

function CountField({ state }: { state: LayersState }): ReactElement {
  const label = tCatalog("layers.input.count.label")
  const range = countRangeOf(state.app, state.mode)
  const value = layerCountOf(state.app, state.mode, state.form.values)
  return (
    <FieldFrame
      caption={label}
      isOptional={false}
      note={null}
      problem={undefined}
    >
      <NumberStepper
        value={value}
        min={range.min}
        max={range.max}
        step={1}
        unit={tCatalog("layers.input.count.unit")}
        label={label}
        onChange={(count) => state.form.setInput(countInput, String(count))}
      />
    </FieldFrame>
  )
}

function LayerField({ state }: { state: LayersState }): ReactElement {
  const missing = state.form.problems.has(layerInput)
  return (
    <FieldFrame
      caption={tCatalog("layers.input.layer.label")}
      isOptional={false}
      note={
        state.pickedNumber === null
          ? null
          : `${tCatalog("layers.layer.name", { number: state.pickedNumber })}. ${tCatalog("layers.input.layer.note")}`
      }
      problem={undefined}
      message={missing ? tCatalog("layers.input.layer.required") : null}
    >
      {null}
    </FieldFrame>
  )
}

function MaskField({ state }: { state: LayersState }): ReactElement {
  return (
    <FieldFrame
      caption={tCatalog("layers.input.mask.label")}
      isOptional={false}
      note={tCatalog("layers.input.mask.note")}
      problem={undefined}
      message={
        state.maskMissing ? tCatalog("layers.input.mask.required") : null
      }
    >
      <div className="flex items-center gap-s3">
        <Slider
          aria-label={tCatalog("layers.brush.size")}
          min={4}
          max={256}
          step={4}
          value={state.brushSize}
          onValueChange={(value) => {
            if (typeof value === "number") {
              state.setBrushSize(value)
            }
          }}
        />
        <Button size="small" onClick={state.clearBrush}>
          {tCatalog("layers.brush.clear")}
        </Button>
      </div>
    </FieldFrame>
  )
}

function inputNamed(
  state: LayersState,
  name: string
): InputDefinition | undefined {
  return state.formApp.inputs.find((input) => input.name === name)
}

const placedInputs: readonly string[] = [modeInput, aspectField]

function SettingRows({
  state,
  settings,
}: {
  state: LayersState
  settings: readonly AppSetting[]
}): ReactNode {
  return settings.map((setting) => {
    if (setting.kind === "input" && setting.input.name === countInput) {
      return null
    }
    if (setting.kind === "count") {
      return isCountShown(state.mode, state.hosted.chosen) ? (
        <CountField key={settingId(setting)} state={state} />
      ) : null
    }
    return (
      <AppSettingRow
        key={settingId(setting)}
        app={state.formApp}
        form={state.form}
        lastSeed={state.lastSeed}
        setting={setting}
      />
    )
  })
}

function GraphFields({
  state,
  model,
}: {
  state: LayersState
  model: ReactNode
}): ReactElement {
  const plan = appSettingsPlan(bodyAppFor(state.app, state.mode), placedInputs)
  return (
    <>
      {shownInputsOf(state.app, state.mode)
        .filter((input) => !isSettingInput(input))
        .map((input) => (
          <PanelField key={input.name} state={state} input={input} />
        ))}
      <CanvasFields state={state} />
      {model}
      <SettingRows state={state} settings={plan.main} />
      {plan.advanced.length === 0 ? null : (
        <AdvancedSection>
          <SettingRows state={state} settings={plan.advanced} />
        </AdvancedSection>
      )}
    </>
  )
}

function CanvasFields({ state }: { state: LayersState }): ReactElement {
  return (
    <>
      {state.mode === "split" ? null : <LayerField state={state} />}
      {state.mode === "fill" ? <MaskField state={state} /> : null}
    </>
  )
}

function ModelFields({
  state,
  model,
}: {
  state: LayersState
  model: ReactNode
}): ReactElement {
  const source = inputNamed(state, sourceInput)
  return (
    <>
      {state.mode === "split" && source !== undefined ? (
        <PanelField state={state} input={source} />
      ) : null}
      <CanvasFields state={state} />
      <HostedFields
        fields={shownFieldsOf(state.hosted.chosen)}
        form={state.form}
        app={state.app}
        model={model}
      />
    </>
  )
}

export function LayersPanel({ state }: { state: LayersState }): ReactElement {
  const modeField = inputNamed(state, modeInput)
  const { hosted } = state
  const model =
    hosted.models.length === 0 && !hosted.isLoading ? null : (
      <CatalogPicker hosted={hosted} place="row" />
    )
  return (
    <div className="flex flex-col gap-s4">
      {modeField === undefined ? null : (
        <PanelField state={state} input={modeField} />
      )}
      {isGraphModel(hosted.chosen) ? (
        <GraphFields state={state} model={model} />
      ) : (
        <ModelFields state={state} model={model} />
      )}
    </div>
  )
}
