import { AspectRatio, IdFormat } from "@rosesfield/kernel"
import { z } from "zod"

export const copyKey = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/)
  .max(120)

export const aspectRatio = z
  .string()
  .regex(AspectRatio.pattern)
  .refine(AspectRatio.isValid)

export const seed = z.number().int().min(0).max(2_147_483_647)

export const adapterKey = z.string().regex(IdFormat.kebabCasePattern).max(40)

export const timestamp = z.iso.datetime()

export const inputName = z
  .string()
  .regex(/^[a-z][a-zA-Z0-9]*$/)
  .max(40)

export const choiceValue = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)?$/)
  .max(40)

export const toggleValue = z.enum(["on", "off"])
