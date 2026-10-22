import type { InputDefinition } from "@rosesfield/contract"
import { Button } from "@rosesfield/ui/components/button"
import { Slider } from "@rosesfield/ui/components/slider"
import type { ReactElement } from "react"
import { tCatalog } from "@/copy/t"
import { NumberStepper } from "@/pieces/number-stepper"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { InputField } from "@/screens/app/fields/input-field"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { AdvancedFields } from "@/screens/app/inputs-panel"
import {
  isCountShown,
  isGraphModel,
  shownFieldsOf,
} from "@/studio/layers/layers-models"
import {
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

function GraphFields({ state }: { state: LayersState }): ReactElement {
  return (
    <>
      {shownInputsOf(state.app, state.mode).map((input) => (
        <PanelField key={input.name} state={state} input={input} />
      ))}
      {isCountShown(state.mode, state.hosted.chosen) ? (
        <CountField state={state} />
      ) : null}
      <AdvancedFields
        app={state.formApp}
        form={state.form}
        lastSeed={state.lastSeed}
      />
    </>
  )
}

function ModelFields({ state }: { state: LayersState }): ReactElement {
  const source = inputNamed(state, sourceInput)
  return (
    <>
      {state.mode === "split" && source !== undefined ? (
        <PanelField state={state} input={source} />
      ) : null}
      <HostedFields
        fields={shownFieldsOf(state.hosted.chosen)}
        form={state.form}
      />
    </>
  )
}

export function LayersPanel({ state }: { state: LayersState }): ReactElement {
  const modeField = inputNamed(state, modeInput)
  const { hosted } = state
  return (
    <div className="flex flex-col gap-s4">
      {modeField === undefined ? null : (
        <PanelField state={state} input={modeField} />
      )}
      {hosted.models.length === 0 && !hosted.isLoading ? null : (
        <CatalogPicker hosted={hosted} place="row" />
      )}
      {state.mode === "split" ? null : <LayerField state={state} />}
      {state.mode === "fill" ? <MaskField state={state} /> : null}
      {isGraphModel(hosted.chosen) ? (
        <GraphFields state={state} />
      ) : (
        <ModelFields state={state} />
      )}
    </div>
  )
}
