import type { AppListing } from "@rosesfield/contract"
import type { ReactElement, ReactNode } from "react"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"

type TaskPanelProps = {
  app: AppListing
  form: AppForm
  hosted: HostedState
  graphPanel: (app: AppListing) => ReactNode
  skipPrompt?: boolean
}

export function withoutModelInput(app: AppListing): AppListing {
  return {
    ...app,
    inputs: app.inputs.filter((input) => input.name !== modelInputName),
  }
}

export function TaskPanel(props: TaskPanelProps): ReactElement {
  const { hosted } = props
  return (
    <div className="flex flex-col gap-s4">
      <CatalogPicker hosted={hosted} place="row" />
      {hosted.fields === null ? (
        props.graphPanel(withoutModelInput(props.app))
      ) : (
        <HostedFields
          fields={hosted.fields}
          form={props.form}
          skip={props.skipPrompt === true ? ["prompt"] : []}
        />
      )}
    </div>
  )
}
