import { z } from "zod"
import source from "./showcase-rows.json"

const exampleInput = z.strictObject({
  file: z.string().min(1),
  name: z.string().min(1),
})

const showcaseRow = z.strictObject({
  runId: z.string().min(1),
  file: z.string().min(1),
  input: exampleInput.optional(),
  appId: z.string().min(1),
  kind: z.enum(["image", "video"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  model: z.string().min(1),
  prompt: z.string().min(1).nullable(),
  inputs: z.record(z.string(), z.string()),
  aspectRatio: z.string().nullable(),
  credits: z.number().nonnegative(),
  seconds: z.number().nonnegative(),
  madeAt: z.iso.datetime(),
  banner: z.enum(["start", "end"]).optional(),
  focus: z.enum(["top", "upper"]).optional(),
  mirror: z.literal(true).optional(),
  from: z.string().min(1).optional(),
})

export type ExampleInput = z.infer<typeof exampleInput>

export type ShowcaseRow = z.infer<typeof showcaseRow>

export const showcaseRows: readonly ShowcaseRow[] = z
  .array(showcaseRow)
  .parse(source)
