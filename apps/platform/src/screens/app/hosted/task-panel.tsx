import type { AppListing } from "@rosesfield/contract"
import type { ReactNode } from "react"
import { CatalogPicker } from "@/screens/app/hosted/catalog-picker"
import { HostedFields } from "@/screens/app/hosted/hosted-fields"
import { modelInputName } from "@/screens/app/hosted/hosted-form"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"
import type { AppForm } from "@/screens/app/use-app-form"

type TaskPanelProps = {
  app: AppListing
  form: AppForm
  hosted: HostedState
  graphPanel: (app: AppListing, model: ReactNode) => ReactNode
  skipPrompt?: boolean
}

export function withoutModelInput(app: AppListing): AppListing {
  return {
    ...app,
    inputs: app.inputs.filter((input) => input.name !== modelInputName),
  }
}

export function TaskPanel(props: TaskPanelProps): ReactNode {
  const { hosted } = props
  const model = <CatalogPicker hosted={hosted} place="row" />
  return hosted.fields === null ? (
    props.graphPanel(withoutModelInput(props.app), model)
  ) : (
    <HostedFields
      fields={hosted.fields}
      form={props.form}
      skip={props.skipPrompt === true ? ["prompt"] : []}
      app={props.app}
      model={model}
    />
  )
}
