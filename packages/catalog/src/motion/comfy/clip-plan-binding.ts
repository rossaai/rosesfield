import type { EngineBinding } from "@rosesfield/contract"

export const clipPlanAdapter = "motion-plan"

/** The plan of a Motion clip runs on the plan engine, never on a graph. */
export const clipPlanBinding: EngineBinding = {
  adapter: clipPlanAdapter,
  config: {},
}

export const clipPlanInputs = {
  clip: "clip",
  frames: "frames",
  photos: "photo",
  sentence: "scene",
} as const

export const keptPlanMime = "text/plain"
