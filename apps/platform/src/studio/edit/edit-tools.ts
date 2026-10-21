import type { AppListing } from "@rosesfield/contract"

export type ToolRatio = "photo" | "format"

export type EditTool = {
  id: string
  ratio: ToolRatio
}

export type ShownTool = {
  tool: EditTool
  app: AppListing
}

export const editToolId = "edit"

export const editTools: readonly EditTool[] = [
  { id: editToolId, ratio: "photo" },
  { id: "angles", ratio: "photo" },
  { id: "relight", ratio: "photo" },
  { id: "try-on", ratio: "photo" },
  { id: "headshots", ratio: "photo" },
  { id: "expand", ratio: "format" },
  { id: "background-removal", ratio: "photo" },
]

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
