import type { AppListing } from "@rosesfield/contract"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { PopoverChip, settingIconOf } from "@/screens/app/bar/setting-chip"
import { InputField } from "@/screens/app/fields/input-field"
import { AspectField, CountField } from "@/screens/app/fields/output-fields"
import { SeedField } from "@/screens/app/fields/seed-field"
import type { AppForm } from "@/screens/app/use-app-form"

type InputsPanelProps = {
  app: AppListing
  form: AppForm
  lastSeed: number | null
}

export function randomSeed(): number {
  const [value = 0] = crypto.getRandomValues(new Uint32Array(1))
  return value % 2_147_483_648
}

export function AdvancedFields({
  app,
  form,
  lastSeed,
}: InputsPanelProps): ReactElement | null {
  const seed = app.inputs.find((input) => input.type === "seed")
  if (seed === undefined) {
    return null
  }
  const value = form.values.inputs[seed.name]
  return (
    <SeedField
      mode={form.values.seedMode}
      value={value}
      onMode={(mode) => {
        form.setForm({ seedMode: mode })
        if (mode === "fixed" && typeof value !== "number") {
          form.setInput(seed.name, lastSeed ?? randomSeed())
        }
      }}
      onChange={(next) => form.setInput(seed.name, next)}
    />
  )
}

export function InputsPanel(props: InputsPanelProps): ReactElement {
  const { app, form } = props
  return (
    <div className="flex flex-col gap-s4">
      {app.inputs
        .filter((input) => input.type !== "seed")
        .map((input) => (
          <InputField
            key={input.name}
            app={app}
            input={input}
            value={form.values.inputs[input.name]}
            problem={form.problems.get(input.name)}
            onChange={(value) => form.setInput(input.name, value)}
            register={(focus) => form.register(input.name, focus)}
          />
        ))}
      <AspectField
        app={app}
        value={form.values.aspectRatio}
        onChange={(aspectRatio) => form.setForm({ aspectRatio })}
      />
      <CountField
        app={app}
        value={form.values.count}
        onChange={(count) => form.setForm({ count })}
      />
      <AdvancedFields {...props} />
    </div>
  )
}

export function SeedChip({
  app,
  form,
  lastSeed,
}: InputsPanelProps): ReactElement | null {
  const seed = app.inputs.find((input) => input.type === "seed")
  if (seed === undefined) {
    return null
  }
  const value = form.values.inputs[seed.name]
  const isFixed = form.values.seedMode === "fixed" && typeof value === "number"
  return (
    <PopoverChip
      label={t("field.seed.label")}
      icon={settingIconOf(seed.name, null)}
      shown={isFixed ? String(value) : t("field.seed.random")}
    >
      <SeedField
        mode={form.values.seedMode}
        value={value}
        onMode={(mode) => {
          form.setForm({ seedMode: mode })
          if (mode === "fixed" && typeof value !== "number") {
            form.setInput(seed.name, lastSeed ?? randomSeed())
          }
        }}
        onChange={(next) => form.setInput(seed.name, next)}
      />
    </PopoverChip>
  )
}
