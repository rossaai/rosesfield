import type { ReactElement } from "react"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"

export function HostedChips({
  hosted,
  form,
}: {
  hosted: HostedState
  form: AppForm
}): ReactElement {
  return (
    <CatalogPicker
      hosted={hosted}
      settings={
        hosted.fields === null || hosted.fields.length <= 1 ? null : (
          <HostedFields fields={hosted.fields} form={form} skip={["prompt"]} />
        )
      }
    />
  )
}
