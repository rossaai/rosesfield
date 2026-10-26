import type { ReactElement } from "react"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { EditFrame } from "@/studio/edit/edit-frame"
import { editToolOf } from "@/studio/edit/edit-tools"
import { useEditTool } from "@/studio/edit/use-edit-tool"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const state = useEditTool(editToolOf(app.id), app, seeds)
  return <EditFrame state={state} />
}
