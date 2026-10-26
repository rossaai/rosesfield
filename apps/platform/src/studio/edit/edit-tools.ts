import type { AppListing } from "@rosesfield/contract"

export type ToolRatio = "photo" | "format"

export type EditTool = {
  id: string
  ratio: ToolRatio
  mode: string | null
  folded: readonly string[]
}

export type ShownTool = {
  tool: EditTool
  app: AppListing
}

export const editToolId = "edit"

export const editTools: readonly EditTool[] = [
  { id: editToolId, ratio: "photo", mode: null, folded: [] },
  { id: "angles", ratio: "photo", mode: "mode", folded: [] },
  {
    id: "relight",
    ratio: "photo",
    mode: null,
    folded: ["color", "softness", "brightness", "quality"],
  },
  { id: "try-on", ratio: "photo", mode: null, folded: [] },
  { id: "headshots", ratio: "photo", mode: null, folded: [] },
  { id: "expand", ratio: "format", mode: "mode", folded: [] },
  { id: "background-removal", ratio: "photo", mode: null, folded: [] },
]

export function editToolOf(appId: string): EditTool {
  return toolOf(appId) ?? { id: appId, ratio: "photo", mode: null, folded: [] }
}

export function toolOf(appId: string): EditTool | null {
  return editTools.find((tool) => tool.id === appId) ?? null
}

export function shownTools(
  find: (appId: string) => AppListing | null
): ShownTool[] {
  return editTools.flatMap((tool) => {
    const app = find(tool.id)
    return app === null ? [] : [{ tool, app }]
  })
}
