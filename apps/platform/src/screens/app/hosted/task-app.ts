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
  const defaultModel = defaultModelOf(app)
  return defaultModel === null ? null : { tasks: appTasksOf(app), defaultModel }
}
