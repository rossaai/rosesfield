import type { ReactElement } from "react"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { ModelFieldChips } from "@/screens/app/hosted/field-chip"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"

export function HostedChips({
  hosted,
  form,
  output,
}: {
  hosted: HostedState
  form: AppForm
  output: string
}): ReactElement {
  return (
    <>
      <CatalogPicker hosted={hosted} />
      <ModelFieldChips
        fields={hosted.fields ?? []}
        form={form}
        output={output}
      />
    </>
  )
}
