import type { ReactElement } from "react"
import type { StudioScreenProps } from "@/screens/app/studio-screens"
import { EditFrame } from "@/studio/edit/edit-frame"
import { type EditTool, toolOf } from "@/studio/edit/edit-tools"
import { useEditTool } from "@/studio/edit/use-edit-tool"

export function AppScreen({ app, seeds }: StudioScreenProps): ReactElement {
  const tool: EditTool = toolOf(app.id) ?? { id: app.id, ratio: "photo" }
  const state = useEditTool(tool, app, seeds)
  return <EditFrame state={state} />
}
