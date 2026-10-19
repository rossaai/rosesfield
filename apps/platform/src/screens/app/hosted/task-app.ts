import { findApp } from "@rosesfield/catalog"
import { appTasksOf, defaultModelOf } from "@rosesfield/catalog/comfy"

export type TaskApp = {
  tasks: readonly string[]
  defaultModel: string | null
}

export function taskAppOf(appId: string): TaskApp | null {
  const app = findApp(appId)
  if (app === null) {
    return null
  }
  const tasks = appTasksOf(app)
  return tasks.length === 0
    ? null
    : { tasks, defaultModel: defaultModelOf(app) }
}
