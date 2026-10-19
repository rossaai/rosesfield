import { z } from "zod"
import { choiceValue, inputName, toggleValue } from "#value.contract"

const valueCondition = z.strictObject({
  input: inputName,
  is: z.array(choiceValue).min(1).max(64),
})

const assetCondition = z.strictObject({
  input: inputName,
  state: z.enum(["empty", "filled"]),
})

export const inputCondition = z.union([valueCondition, assetCondition])

export const inputWhen = z.array(inputCondition).min(1).max(4)

export const choiceBound = z.strictObject({
  when: inputWhen,
  values: z.array(choiceValue).min(1).max(64),
})

export const toggleBound = z.strictObject({
  when: inputWhen,
  values: z.array(toggleValue).min(1).max(2),
})

export const numberBound = z
  .strictObject({ when: inputWhen, min: z.number(), max: z.number() })
  .refine((bound) => bound.min <= bound.max, {
    message: "A bound's min must not pass its max",
    path: ["max"],
  })

export type InputCondition = z.infer<typeof inputCondition>
export type InputWhen = z.infer<typeof inputWhen>
export type ChoiceBound = z.infer<typeof choiceBound>
export type ToggleBound = z.infer<typeof toggleBound>
export type NumberBound = z.infer<typeof numberBound>
