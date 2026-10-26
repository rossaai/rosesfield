import type { AppListing, InputDefinition } from "@rosesfield/contract"
import type { ReactElement, ReactNode } from "react"
import { t } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import { SeedField } from "@/screens/app/fields/seed-field"
import type { AppSetting, SettingsPlan } from "@/screens/app/settings-plan"
import type { AppForm } from "@/screens/app/use-app-form"

type SeedInput = Extract<InputDefinition, { type: "seed" }>

type RowsProps = {
  app: AppListing
  form: AppForm
  lastSeed: number | null
}

export function randomSeed(): number {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1))
  return value % 2_147_483_648
}

export function SeedRow({
  input,
  form,
  lastSeed,
}: Omit<RowsProps, "app"> & { input: SeedInput }): ReactElement {
  const value = form.values.inputs[input.name]
  return (
    <SeedField
      mode={form.values.seedMode}
      value={value}
      onMode={(mode) => {
        form.setForm({ seedMode: mode })
        if (mode === "fixed" && typeof value !== "number") {
          form.setInput(input.name, lastSeed ?? randomSeed())
        }
      }}
      onChange={(next) => form.setInput(input.name, next)}
    />
  )
}

export function AppSettingRow({
  app,
  form,
  lastSeed,
  setting,
}: RowsProps & { setting: AppSetting }): ReactElement | null {
  switch (setting.kind) {
    case "aspect":
      return (
        <AspectField
          app={app}
          value={form.values.aspectRatio}
          onChange={(aspectRatio) => form.setForm({ aspectRatio })}
        />
      )
    case "count":
      return (
        <CountField
          app={app}
          value={form.values.count}
          onChange={(count) => form.setForm({ count })}
        />
      )
    case "input": {
      const { input } = setting
      return input.type === "seed" ? (
        <SeedRow input={input} form={form} lastSeed={lastSeed} />
      ) : (
        <InputField
          app={app}
          input={input}
          value={form.values.inputs[input.name]}
          problem={form.problems.get(input.name)}
          onChange={(value) => form.setInput(input.name, value)}
          register={(focus) => form.register(input.name, focus)}
        />
      )
    }
  }
}

export function settingId(setting: AppSetting): string {
  return setting.kind === "input" ? `input:${setting.input.name}` : setting.kind
}

export function AppSettingRows({
  settings,
  ...props
}: RowsProps & { settings: readonly AppSetting[] }): ReactNode {
  return settings.map((setting) => (
    <AppSettingRow key={settingId(setting)} {...props} setting={setting} />
  ))
}

export function AdvancedSection({
  children,
}: {
  children: ReactNode
}): ReactElement {
  return (
    <CollapsibleSection title={t("field.advanced")}>
      {children}
    </CollapsibleSection>
  )
}

export function AppSettingsSection({
  plan,
  ...props
}: RowsProps & { plan: SettingsPlan<AppSetting> }): ReactNode {
  return (
    <>
      <AppSettingRows {...props} settings={plan.main} />
      {plan.advanced.length === 0 ? null : (
        <AdvancedSection>
          <AppSettingRows {...props} settings={plan.advanced} />
        </AdvancedSection>
      )}
    </>
  )
}
