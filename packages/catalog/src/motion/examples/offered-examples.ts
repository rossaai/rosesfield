import type { AppDefinition } from "@rosesfield/contract"
import { AppDefinitionInvalidError } from "#app-definition-invalid.error"
import { readApps } from "#list-apps"
import { motionApp } from "#motion/app"
import type { LibraryExample } from "#motion/examples/library-example.contract"
import { libraryExamples } from "#motion/examples/library-examples"

export type ServerReach = {
  mode: "owner" | "public"
  lock: "local" | "token" | "none"
}

const motionFolder = "motion"

export function canTryDrafts(reach: ServerReach): boolean {
  return reach.mode === "owner" && reach.lock === "local"
}

export function offeredExamples(
  examples: readonly LibraryExample[],
  reach: ServerReach
): readonly LibraryExample[] {
  const approved = examples.filter((example) => example.approved)
  const drafts = examples.filter((example) => !example.approved)
  return canTryDrafts(reach) ? [...approved, ...drafts] : approved
}

export function offeredMotionApp(
  examples: readonly LibraryExample[],
  reach: ServerReach
): AppDefinition {
  const [app] = readApps([
    {
      folder: motionFolder,
      app: motionApp(offeredExamples(examples, reach)),
    },
  ])
  if (app === undefined) {
    throw new AppDefinitionInvalidError({
      folder: motionFolder,
      reason: "the offered examples did not make an app",
    })
  }
  return app
}

export function withOfferedExamples(
  apps: readonly AppDefinition[],
  reach: ServerReach
): readonly AppDefinition[] {
  if (!canTryDrafts(reach)) {
    return apps
  }
  const offered = offeredMotionApp(libraryExamples, reach)
  return apps.map((app) => (app.id === motionFolder ? offered : app))
}
