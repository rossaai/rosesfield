import type { appDefinition } from "@rosesfield/contract"
import type { z } from "zod"

export type AppInput = z.input<typeof appDefinition>

export type AppEntry = {
  folder: string
  app: AppInput
}

export function defineApp(app: AppInput): AppInput {
  return app
}
