import type { ModelField } from "@rosesfield/catalog/comfy"
import { useEffect, useRef } from "react"
import { hostedDefaults } from "@/screens/app/hosted/hosted-form"
import type { AppForm } from "@/screens/app/use-app-form"

export function missingDefaults(
  fields: readonly ModelField[],
  inputs: AppForm["values"]["inputs"]
): Record<string, NonNullable<AppForm["values"]["inputs"][string]>> {
  const defaults = hostedDefaults(fields, inputs)
  return Object.fromEntries(
    fields.flatMap((field) => {
      const value = defaults[field.name]
      return inputs[field.name] === undefined &&
        value !== undefined &&
        !(Array.isArray(value) && value.length === 0)
        ? [[field.name, value]]
        : []
    })
  )
}

export function useHostedDefaults(
  form: AppForm,
  fields: readonly ModelField[] | null
): void {
  const { setForm, values } = form
  const filledFor = useRef<readonly ModelField[] | null>(null)
  useEffect(() => {
    if (fields === null || filledFor.current === fields) {
      return
    }
    filledFor.current = fields
    const missing = missingDefaults(fields, values.inputs)
    if (Object.keys(missing).length > 0) {
      setForm({ inputs: { ...values.inputs, ...missing } })
    }
  }, [fields, values.inputs, setForm])
}
