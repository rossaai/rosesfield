import type { Workflow } from "@rosesfield/catalog/workflows"

const uiFiles = import.meta.glob(
  [
    "../../../../workflows/*/*.json",
    "!../../../../workflows/*/*.api.json",
    "!../../../../workflows/*/entry.json",
  ],
  { query: "?url", import: "default" }
)

export function workflowFileLoader(
  workflow: Workflow
): (() => Promise<string>) | null {
  const entry = Object.entries(uiFiles).find(([path]) =>
    path.endsWith(`/${workflow.files.ui}`)
  )
  return entry === undefined ? null : entry[1]
}
