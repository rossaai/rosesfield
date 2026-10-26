import type { ModelField } from "#domain/model-form"

export type FieldRole =
  | "prompt"
  | "aspect"
  | "resolution"
  | "quality"
  | "count"
  | "length"
  | "seed"
  | "sound"
  | "first-frame"
  | "last-frame"
  | "reference"

export const fieldRoles: readonly FieldRole[] = [
  "prompt",
  "aspect",
  "resolution",
  "quality",
  "count",
  "length",
  "seed",
  "sound",
  "first-frame",
  "last-frame",
  "reference",
]

type KeyRule = {
  role: FieldRole
  kinds: readonly ModelField["kind"][]
  keys: readonly string[]
}

const keyRules: readonly KeyRule[] = [
  {
    role: "aspect",
    kinds: ["choice", "text"],
    keys: ["aspectratio", "aspect", "ratio"],
  },
  {
    role: "resolution",
    kinds: ["choice", "text"],
    keys: ["resolution", "outputresolution", "size", "imagesize", "outputsize"],
  },
  { role: "quality", kinds: ["choice", "text"], keys: ["quality"] },
  {
    role: "count",
    kinds: ["number"],
    keys: [
      "n",
      "numimages",
      "samplecount",
      "count",
      "numoutputs",
      "numberofimages",
      "numberresults",
      "maximages",
      "seriesamount",
    ],
  },
  {
    role: "length",
    kinds: ["number", "choice", "text"],
    keys: ["duration", "durationseconds", "durations", "seconds", "length"],
  },
  { role: "seed", kinds: ["number"], keys: ["seed"] },
  {
    role: "sound",
    kinds: ["toggle", "choice"],
    keys: ["generateaudio", "saveaudio", "withaudio", "sound", "audio"],
  },
]

const resultParents: ReadonlySet<string> = new Set([
  "input",
  "parameters",
  "settings",
  "video",
])

const switchWords: readonly (readonly [string, string])[] = [
  ["on", "off"],
  ["true", "false"],
  ["yes", "no"],
]

const lastFrame = /(last|end|tail)[_ ]?(frame|image)/i

const firstFrame = /(first|start)[_ ]?(frame|image)/i

const reference = /reference|(^|[^a-z])ref([^a-z]|$)/i

const mask = /mask/i

function namedOf(path: string): string[] {
  return path.split(".").filter((one) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(one))
}

function keyOf(field: ModelField): string {
  return (namedOf(field.path).at(-1) ?? field.name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function isResultLength(field: ModelField): boolean {
  return namedOf(field.path)
    .slice(0, -1)
    .every((parent) => resultParents.has(parent.toLowerCase()))
}

function isSwitchChoice(field: ModelField): boolean {
  if (field.kind !== "choice") {
    return true
  }
  const words = field.options.map((one) => String(one).toLowerCase()).sort()
  return switchWords.some(
    (pair) =>
      words.length === 2 &&
      [...pair].sort().every((one, at) => words[at] === one)
  )
}

function fits(rule: KeyRule, field: ModelField): boolean {
  switch (rule.role) {
    case "length":
      return isResultLength(field)
    case "sound":
      return isSwitchChoice(field)
    default:
      return true
  }
}

function imageRoleOf(path: string, output: string): FieldRole | null {
  if (mask.test(path)) {
    return null
  }
  if (lastFrame.test(path)) {
    return "last-frame"
  }
  if (firstFrame.test(path)) {
    return "first-frame"
  }
  if (reference.test(path)) {
    return "reference"
  }
  return output === "video" ? "first-frame" : "reference"
}

/** Names what one field of a model's form does, for a model that makes the given output. */
export function fieldRoleOf(
  field: ModelField,
  output: string
): FieldRole | null {
  if (field.kind === "prompt") {
    return "prompt"
  }
  if (field.kind === "media") {
    return field.media === "image" ? imageRoleOf(field.path, output) : null
  }
  const key = keyOf(field)
  const rule = keyRules.find(
    (one) =>
      one.kinds.includes(field.kind) &&
      one.keys.includes(key) &&
      fits(one, field)
  )
  return rule?.role ?? null
}

/** Names what an input of the given name does, read as a choice of a model that makes the given output. */
export function inputRoleOf(name: string, output: string): FieldRole | null {
  return fieldRoleOf(
    {
      kind: "choice",
      name,
      path: name,
      required: false,
      options: [],
      default: null,
    },
    output
  )
}

/** Says whether a model makes one output per job, because its form holds no count field that asks for more than one. */
export function isOneAtATime(
  fields: readonly ModelField[],
  output: string
): boolean {
  const field = fieldOfRole(fields, "count", output)
  return (
    field === null ||
    (field.kind === "number" && field.max !== null && field.max < 2)
  )
}

/** Finds the first field of a form that holds the given role. */
export function fieldOfRole(
  fields: readonly ModelField[],
  role: FieldRole,
  output: string
): ModelField | null {
  return fields.find((field) => fieldRoleOf(field, output) === role) ?? null
}
