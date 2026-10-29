import { z } from "zod"
import { assetId, characterId } from "#id.contract"
import {
  choiceBound,
  inputWhen,
  numberBound,
  toggleBound,
} from "#input-condition.contract"
import { choiceValue, copyKey, inputName, toggleValue } from "#value.contract"

const presence = z.enum(["required", "optional"])

const chainFill = z.literal("chain")

const named = {
  name: inputName,
  labelKey: copyKey,
  when: inputWhen.optional(),
  scope: z.literal("app").optional(),
  fill: chainFill.optional(),
}

const promptInput = z.strictObject({
  type: z.literal("prompt"),
  ...named,
  presence,
  maxLength: z.number().int().min(1).max(10_000),
})

function referenceInput<Type extends string>(type: Type) {
  return z.strictObject({
    type: z.literal(type),
    ...named,
    presence,
    max: z.number().int().min(1).max(16),
  })
}

export const imageFormats = ["image/png", "image/jpeg", "image/webp"] as const

export const imageAccept = z
  .strictObject({
    formats: z.array(z.enum(imageFormats)).min(1).max(3),
    maxBytes: z.number().int().min(1),
    minShortSide: z.number().int().min(1).max(8192),
  })
  .refine((accept) => new Set(accept.formats).size === accept.formats.length, {
    message: "Each format appears once",
    path: ["formats"],
  })

const imageInput = referenceInput("image").extend({
  accept: imageAccept.optional(),
})

const choiceOption = z.strictObject({
  value: choiceValue,
  labelKey: copyKey,
  count: z.number().int().min(1).max(16).optional(),
  fill: chainFill.optional(),
})

const choiceInput = z
  .strictObject({
    type: z.literal("choice"),
    ...named,
    options: z.array(choiceOption).min(1).max(64),
    default: choiceValue,
    bounds: z.array(choiceBound).min(1).max(16).optional(),
  })
  .refine(
    (input) =>
      new Set(input.options.map((option) => option.value)).size ===
      input.options.length,
    { message: "Each option needs its own value", path: ["options"] }
  )
  .refine(
    (input) => input.options.some((option) => option.value === input.default),
    { message: "The default must be one of the options", path: ["default"] }
  )
  .refine(
    (input) =>
      (input.bounds ?? []).every((bound) =>
        bound.values.every((value) =>
          input.options.some((option) => option.value === value)
        )
      ),
    { message: "A bound offers only the input's options", path: ["bounds"] }
  )

function isOnStep(value: number, step: number): boolean {
  return z.number().multipleOf(step).safeParse(value).success
}

const numberInput = z
  .strictObject({
    type: z.literal("number"),
    ...named,
    min: z.number(),
    max: z.number(),
    step: z.number().positive(),
    default: z.number(),
    bounds: z.array(numberBound).min(1).max(16).optional(),
  })
  .refine((input) => input.min < input.max, {
    message: "min must be below max",
    path: ["max"],
  })
  .refine((input) => input.min <= input.default && input.default <= input.max, {
    message: "The default must sit between min and max",
    path: ["default"],
  })
  .refine(
    (input) =>
      [input.min, input.max, input.default].every((value) =>
        isOnStep(value, input.step)
      ),
    { message: "min, max and the default must be multiples of step" }
  )
  .refine(
    (input) =>
      (input.bounds ?? []).every(
        (bound) =>
          input.min <= bound.min &&
          bound.max <= input.max &&
          isOnStep(bound.min, input.step) &&
          isOnStep(bound.max, input.step)
      ),
    {
      message: "A bound sits between min and max, on multiples of step",
      path: ["bounds"],
    }
  )

const toggleInput = z.strictObject({
  type: z.literal("toggle"),
  ...named,
  default: toggleValue,
  bounds: z.array(toggleBound).min(1).max(16).optional(),
})

const seedInput = z.strictObject({
  type: z.literal("seed"),
  name: inputName,
  labelKey: copyKey,
})

export const inputDefinition = z.discriminatedUnion("type", [
  promptInput,
  imageInput,
  referenceInput("video"),
  referenceInput("audio"),
  referenceInput("character"),
  choiceInput,
  numberInput,
  toggleInput,
  seedInput,
])

export const inputValue = z.union([
  z.string(),
  z.number(),
  z.array(z.union([assetId, characterId])),
])

export const runInputs = z.record(inputName, inputValue)

export type InputDefinition = z.infer<typeof inputDefinition>
export type ImageAccept = z.infer<typeof imageAccept>
export type InputValue = z.infer<typeof inputValue>
export type RunInputs = z.infer<typeof runInputs>

/** Says whether a run chain fills this input or picks this option, so no surface shows it to a person. */
export function isChainFilled(one: object): boolean {
  return "fill" in one && one.fill === "chain"
}

export function isAppOnly(input: InputDefinition): boolean {
  return input.type !== "seed" && input.scope === "app"
}
