import type { ReactElement, ReactNode } from "react"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { ModelFieldChips } from "@/screens/app/hosted/field-chip"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"

export function HostedChips({
  hosted,
  form,
  output,
  formats,
}: {
  hosted: HostedState
  form: AppForm
  output: string
  formats?: ReactNode
}): ReactElement {
  return (
    <>
      <CatalogPicker hosted={hosted} />
      {formats}
      <ModelFieldChips
        fields={hosted.fields ?? []}
        form={form}
        output={output}
      />
    </>
  )
}
