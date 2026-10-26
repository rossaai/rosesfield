import type { ModelField } from "@rosesfield/catalog/comfy"
import type { AppListing } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { appliedApp, countField } from "@/screens/app/app-form"
import { AppModelPicker, modelInputOf } from "@/screens/app/bar/model-settings"
import { AdvancedChip, SettingChip } from "@/screens/app/bar/setting-chip"
import { AppSettingRows } from "@/screens/app/fields/setting-rows"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { ModelFieldChips } from "@/screens/app/hosted/field-chip"
import type { AppForm } from "@/screens/app/use-app-form"
import {
  type FoldedPlan,
  hasModelChoice,
  toolChipsOf,
} from "@/studio/edit/edit-form"
import type { EditToolState } from "@/studio/edit/use-edit-tool"
import { HostedSettingChips } from "@/studio/image/image-chips"
import { imageFieldsOf } from "@/studio/image/image-fields"

function ModelChoice({ state }: { state: EditToolState }): ReactElement | null {
  const { hosted, app, form } = state
  if (hosted?.isTaskApp === true) {
    return hasModelChoice(hosted) ? <CatalogPicker hosted={hosted} /> : null
  }
  const model = modelInputOf(app)
  return model === null || model.options.length < 2 ? null : (
    <AppModelPicker
      app={appliedApp(app, form.values.inputs)}
      form={form}
      place="chip"
    />
  )
}

function HostedToolChips({
  state,
  fields,
}: {
  state: EditToolState
  fields: readonly ModelField[]
}): ReactElement {
  const split = imageFieldsOf(fields)
  return (
    <>
      <ModelChoice state={state} />
      <HostedSettingChips app={state.app} fields={split} form={state.form} />
      <ModelFieldChips
        fields={split.rest}
        form={state.form}
        output={state.app.output.kind}
      />
    </>
  )
}

export function FoldedChips({
  app,
  form,
  lastSeed,
  plan,
  hasCount = false,
}: {
  app: AppListing
  form: AppForm
  lastSeed: number | null
  plan: FoldedPlan
  hasCount?: boolean
}): ReactElement {
  return (
    <>
      {plan.main.map((name) => (
        <SettingChip key={name} app={app} form={form} name={name} />
      ))}
      {hasCount ? (
        <SettingChip app={app} form={form} name={countField} />
      ) : null}
      {plan.advanced.length === 0 ? null : (
        <AdvancedChip>
          <AppSettingRows
            app={app}
            form={form}
            lastSeed={lastSeed}
            settings={plan.advanced}
          />
        </AdvancedChip>
      )}
    </>
  )
}

function GraphToolChips({ state }: { state: EditToolState }): ReactElement {
  const { form } = state
  const chips = toolChipsOf(state.tool, state.app, form.values.inputs)
  return (
    <>
      {chips.mode === null ? null : (
        <SettingChip app={chips.app} form={form} name={chips.mode} />
      )}
      <ModelChoice state={state} />
      <FoldedChips
        app={chips.app}
        form={form}
        lastSeed={state.lastSeed}
        plan={chips}
        hasCount={chips.hasCount}
      />
    </>
  )
}

export function ToolChips({ state }: { state: EditToolState }): ReactElement {
  const fields = state.hosted?.fields ?? null
  return state.hosted?.isTaskApp === true && fields !== null ? (
    <HostedToolChips state={state} fields={fields} />
  ) : (
    <GraphToolChips state={state} />
  )
}
