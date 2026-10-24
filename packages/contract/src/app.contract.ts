import { z } from "zod"
import { assetKind } from "#asset.contract"
import { appId } from "#id.contract"
import { type InputDefinition, inputDefinition } from "#input.contract"
import type { InputCondition } from "#input-condition.contract"
import { adapterKey, aspectRatio, copyKey } from "#value.contract"

export const appCategory = z.enum(["image", "video", "audio", "character"])

export const appLayout = z.enum(["bar", "column"])

const outputCount = z
  .strictObject({
    default: z.number().int().min(1),
    max: z.number().int().min(1).max(16),
  })
  .refine((count) => count.default <= count.max, {
    message: "The default count must not pass max",
    path: ["default"],
  })

const aspectRatioChoice = z
  .strictObject({
    options: z.array(aspectRatio).min(1).max(16),
    default: aspectRatio,
  })
  .refine((choice) => new Set(choice.options).size === choice.options.length, {
    message: "Each aspect ratio appears once",
    path: ["options"],
  })
  .refine((choice) => choice.options.includes(choice.default), {
    message: "The default must be one of the options",
    path: ["default"],
  })

export const appOutput = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("image"),
    count: outputCount,
    aspectRatios: aspectRatioChoice,
  }),
  z.strictObject({
    kind: z.literal("video"),
    count: outputCount,
    aspectRatios: aspectRatioChoice,
  }),
  z.strictObject({ kind: z.literal("audio"), count: outputCount }),
  z.strictObject({ kind: z.literal("text"), count: outputCount }),
  z.strictObject({ kind: z.literal("mesh"), count: outputCount }),
])

export const engineBinding = z.strictObject({
  adapter: adapterKey,
  config: z.record(z.string(), z.unknown()),
})

export const appLimits = z.strictObject({
  timeoutSeconds: z.number().int().min(1).max(86_400),
  maxRetries: z.number().int().min(0).max(10),
})

export const appPreview = z.strictObject({
  kind: assetKind.extract(["image", "video"]),
  path: z
    .string()
    .regex(
      /^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*\.(jpg|png|webp|mp4|webm)$/
    ),
  altKey: copyKey,
})

const appFields = z.strictObject({
  id: appId,
  nameKey: copyKey,
  category: appCategory,
  layout: appLayout.default("column"),
  inputs: z.array(inputDefinition).max(32),
  output: appOutput,
  engine: engineBinding,
  limits: appLimits,
  preview: appPreview.nullable().default(null),
  closedKey: copyKey.nullable().default(null),
})

type AppFields = z.infer<typeof appFields>

function checkInputs(app: AppFields, context: z.RefinementCtx): void {
  const seen = new Set<string>()
  app.inputs.forEach((input, index) => {
    if (seen.has(input.name)) {
      context.addIssue({
        code: "custom",
        message: `Two inputs are named ${input.name}`,
        path: ["inputs", index, "name"],
      })
    }
    seen.add(input.name)
  })
  if (app.inputs.filter((input) => input.type === "seed").length > 1) {
    context.addIssue({
      code: "custom",
      message: "An app takes at most one seed input",
      path: ["inputs"],
    })
  }
  checkFixedCounts(app, context)
  app.inputs.forEach((input, index) => {
    for (const condition of conditionsOf(input)) {
      const problem = conditionProblem(condition, app.inputs.slice(0, index))
      if (problem !== null) {
        context.addIssue({
          code: "custom",
          message: problem,
          path: ["inputs", index],
        })
      }
    }
  })
}

function conditionsOf(input: InputDefinition): InputCondition[] {
  if (input.type === "seed") {
    return []
  }
  const bounds = "bounds" in input ? (input.bounds ?? []) : []
  return [...(input.when ?? []), ...bounds.flatMap((bound) => bound.when)]
}

function conditionProblem(
  condition: InputCondition,
  earlier: readonly InputDefinition[]
): string | null {
  const target = earlier.find((input) => input.name === condition.input)
  if (target === undefined) {
    return `A condition names ${condition.input}, which is not an input declared before it`
  }
  if ("state" in condition) {
    return ["image", "video", "audio", "character"].includes(target.type)
      ? null
      : `A condition on whether ${target.name} is filled needs an asset or character input`
  }
  const values =
    target.type === "choice"
      ? target.options.map((option) => option.value)
      : target.type === "toggle"
        ? ["on", "off"]
        : null
  if (values === null) {
    return `A condition on the value of ${target.name} needs a choice or a toggle`
  }
  const unknown = condition.is.find((value) => !values.includes(value))
  return unknown === undefined
    ? null
    : `A condition names ${unknown}, which ${target.name} does not offer`
}

function checkFixedCounts(app: AppFields, context: z.RefinementCtx): void {
  let fixing = 0
  app.inputs.forEach((input, index) => {
    if (input.type !== "choice") {
      return
    }
    const counts = input.options.map((option) => option.count)
    if (counts.every((count) => count === undefined)) {
      return
    }
    fixing += 1
    if (input.when !== undefined) {
      context.addIssue({
        code: "custom",
        message: "A choice that fixes the count applies in every case",
        path: ["inputs", index, "when"],
      })
    }
    if (counts.some((count) => count === undefined)) {
      context.addIssue({
        code: "custom",
        message: "A choice that fixes the count fixes it for each option",
        path: ["inputs", index, "options"],
      })
    }
    if (counts.some((count) => (count ?? 0) > app.output.count.max)) {
      context.addIssue({
        code: "custom",
        message: "A fixed count must not pass the output max",
        path: ["inputs", index, "options"],
      })
    }
  })
  if (fixing > 1) {
    context.addIssue({
      code: "custom",
      message: "At most one choice fixes the count",
      path: ["inputs"],
    })
  }
}

export const appDefinition = appFields.superRefine(checkInputs)

export const appListing = z.object(appFields.omit({ engine: true }).shape)

export type AppCategory = z.infer<typeof appCategory>
export type AppLayout = z.infer<typeof appLayout>
export type AppOutput = z.infer<typeof appOutput>
export type EngineBinding = z.infer<typeof engineBinding>
export type AppLimits = z.infer<typeof appLimits>
export type AppPreview = z.infer<typeof appPreview>
export type AppDefinition = z.infer<typeof appDefinition>
export type AppListing = z.infer<typeof appListing>
