import { choiceValue } from "@rosesfield/contract"
import { z } from "zod"

const digest = z.string().regex(/^[0-9a-f]{64}$/)

const settingName = z.string().regex(/^[a-z][A-Za-z0-9_]*$/)

export const sheetPreview = z.strictObject({
  file: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*\.webp$/),
  sha256: digest,
  width: z.number().int().min(64),
  height: z.number().int().min(64),
  runId: z.uuid(),
  model: z.string().min(1),
  engine: z.string().min(1),
  settings: z.record(settingName, z.string().min(1)),
  aspectRatio: z.string().min(1).nullable(),
  credits: z.number().positive(),
  seconds: z.number().positive(),
  madeAt: z.iso.datetime(),
})

export const sheetTemplate = z.strictObject({
  id: choiceValue,
  traits: z.record(settingName, choiceValue),
  preview: sheetPreview,
})

export const sheetTemplates = z
  .array(sheetTemplate)
  .refine(
    (templates) =>
      new Set(templates.map((template) => template.id)).size ===
      templates.length,
    { message: "Each template has an id of its own" }
  )

export type SheetPreview = z.infer<typeof sheetPreview>
export type SheetTemplate = z.infer<typeof sheetTemplate>
