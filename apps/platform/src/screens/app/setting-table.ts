import {
  type FieldRole,
  fieldRoleOf,
  type ModelField,
} from "@rosesfield/catalog/comfy"

export type NormalSetting =
  | "format"
  | "resolution"
  | "quality"
  | "length"
  | "count"
  | "voice"
  | "language"
  | "scale"
  | "content"

export type SentValue =
  | { kind: "model" }
  | { kind: "on" }
  | { kind: "off" }
  | { kind: "value"; value: string }
  | { kind: "count" }

export type FieldPlace =
  | { kind: "show"; setting: NormalSetting }
  | { kind: "advanced" }
  | { kind: "hidden"; sent: SentValue }

export type SettingPlace = FieldPlace["kind"]

type Row = {
  names: readonly string[]
  path?: RegExp
  options?: readonly string[]
  place: FieldPlace
}

const advanced: FieldPlace = { kind: "advanced" }

function show(setting: NormalSetting): FieldPlace {
  return { kind: "show", setting }
}

function hidden(sent: SentValue): FieldPlace {
  return { kind: "hidden", sent }
}

const on = hidden({ kind: "on" })

const off = hidden({ kind: "off" })

const soundNames: readonly string[] = [
  "generateAudio",
  "saveAudio",
  "withAudio",
  "sound",
  "audio",
]

const keepSoundNames: readonly string[] = [
  "keepOriginalSound",
  "preserveAudio",
  "keepSound",
]

const advancedNames: readonly string[] = [
  "seed",
  "negativePrompt",
  "loop",
  "speed",
  "voiceSpeed",
  "speechRate",
  "topology",
  "targetPolycount",
  "poseMode",
]

const rows: readonly Row[] = [
  { names: ["enabled", "enable"], path: /watermark_info/i, place: off },
  { names: ["watermark", "addWatermark", "aigcWatermark"], place: off },
  { names: soundNames, place: on },
  { names: keepSoundNames, place: on },
  {
    names: ["serviceTier"],
    place: hidden({ kind: "value", value: "default" }),
  },
  {
    names: ["promptExpansionMode"],
    place: hidden({ kind: "value", value: "balanced" }),
  },
  { names: ["alphaMode"], place: hidden({ kind: "value", value: "auto" }) },
  {
    names: ["controlType"],
    place: hidden({ kind: "value", value: "motion_control" }),
  },
  {
    names: ["sequentialImageGeneration", "resultType"],
    place: hidden({ kind: "count" }),
  },
  { names: ["draft"], place: hidden({ kind: "model" }) },
  { names: advancedNames, place: advanced },
  { names: ["voiceId"], place: show("voice") },
  {
    names: ["languageCode", "language", "locale", "voiceLanguage"],
    place: show("language"),
  },
  {
    names: ["scaleFactor", "upscaleFactor", "desiredIncrease"],
    place: show("scale"),
  },
  { names: ["targetResolution"], place: show("scale") },
  { names: ["renderingSpeed"], place: show("quality") },
  {
    names: ["mode"],
    path: /^mode$/,
    options: ["std", "pro", "base", "high_control", "fast"],
    place: show("quality"),
  },
  {
    names: ["season", "lightDirection", "lightType", "artStyle"],
    place: show("content"),
  },
  { names: ["backgroundColor"], place: show("content") },
]

const rolePlaces: Partial<Record<FieldRole, FieldPlace>> = {
  aspect: show("format"),
  resolution: show("resolution"),
  quality: show("quality"),
  length: show("length"),
  count: show("count"),
  seed: advanced,
  sound: on,
}

export function settingKeyOf(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function keysOf(field: ModelField): string[] {
  const last = field.path
    .split(".")
    .filter((one) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(one))
    .at(-1)
  return [settingKeyOf(field.name), settingKeyOf(last ?? field.name)]
}

function isRowOf(row: Row, field: ModelField): boolean {
  const keys = keysOf(field)
  if (!row.names.some((name) => keys.includes(settingKeyOf(name)))) {
    return false
  }
  if (row.path !== undefined && !row.path.test(field.path)) {
    return false
  }
  const allowed = row.options
  return (
    allowed === undefined ||
    (field.kind === "choice" &&
      field.options.every((option) => allowed.includes(String(option))))
  )
}

const switchWords: readonly (readonly [string, string])[] = [
  ["true", "false"],
  ["on", "off"],
  ["yes", "no"],
  ["enabled", "disabled"],
]

export type SwitchWords = { on: string; off: string }

/** Finds the on and off words of a choice of two options that means on or off, read from each option's words. */
export function switchWordsOf(
  options: readonly (readonly string[])[]
): SwitchWords | null {
  const [first, second] = options
  if (options.length !== 2 || first === undefined || second === undefined) {
    return null
  }
  const lower = (words: readonly string[]): string[] =>
    words.map((word) => word.trim().toLowerCase())
  for (const [onWord, offWord] of switchWords) {
    if (lower(first).includes(onWord) && lower(second).includes(offWord)) {
      return { on: first[0] ?? "", off: second[0] ?? "" }
    }
    if (lower(second).includes(onWord) && lower(first).includes(offWord)) {
      return { on: second[0] ?? "", off: first[0] ?? "" }
    }
  }
  return null
}

function modelValueOf(field: ModelField): string | number | undefined {
  switch (field.kind) {
    case "toggle":
      return field.default === null ? undefined : field.default ? "on" : "off"
    case "choice":
      if (field.options.length === 1) {
        return field.options[0]
      }
      return field.default ?? undefined
    case "number":
      return field.default ?? undefined
    case "prompt":
    case "text":
      return field.default ?? undefined
    case "media":
      return undefined
  }
}

function switchValueOf(
  field: ModelField,
  want: "on" | "off"
): string | number | undefined {
  if (field.kind === "toggle") {
    return want
  }
  if (field.kind !== "choice") {
    return modelValueOf(field)
  }
  const words = switchWordsOf(field.options.map((one) => [String(one)]))
  if (words === null) {
    return modelValueOf(field)
  }
  const value = want === "on" ? words.on : words.off
  return field.options.find((one) => String(one) === value)
}

/** Gives the value a field the table hides is sent at, or undefined to send none. */
export function sentValueOf(
  field: ModelField,
  sent: SentValue
): string | number | undefined {
  switch (sent.kind) {
    case "on":
    case "off":
      return switchValueOf(field, sent.kind)
    case "value":
      return field.kind === "choice" &&
        field.options.some((one) => String(one) === sent.value)
        ? sent.value
        : modelValueOf(field)
    case "model":
    case "count":
      return modelValueOf(field)
  }
}

function tablePlaceOf(field: ModelField): FieldPlace {
  const row = rows.find((one) => isRowOf(one, field))
  if (row !== undefined) {
    return row.place
  }
  const role = fieldRoleOf(field, "")
  return (
    (role === null ? undefined : rolePlaces[role]) ?? hidden({ kind: "model" })
  )
}

/** Places one field of a model's form: shown as one normalized setting, under Advanced, or hidden and sent at a value. A field with nothing to send that the model needs stays shown. */
export function fieldPlaceOf(field: ModelField): FieldPlace {
  const place = tablePlaceOf(field)
  if (
    place.kind === "hidden" &&
    field.required &&
    sentValueOf(field, place.sent) === undefined
  ) {
    return show("content")
  }
  return place
}

/** Places one setting input an app declares: its sound inputs are hidden, its seed and rare settings sit under Advanced, and every other is shown. */
export function inputPlaceOf(
  name: string,
  type: "choice" | "number" | "toggle" | "seed"
): SettingPlace {
  const key = settingKeyOf(name)
  const isNamed = (names: readonly string[]): boolean =>
    names.some((one) => settingKeyOf(one) === key)
  if (type === "toggle" && isNamed([...soundNames, ...keepSoundNames])) {
    return "hidden"
  }
  return type === "seed" || isNamed(advancedNames) ? "advanced" : "show"
}

/** Gives the value an app's hidden sound input is sent at. */
export function inputSentValueOf(
  name: string,
  type: "choice" | "number" | "toggle" | "seed"
): "on" | undefined {
  return inputPlaceOf(name, type) === "hidden" ? "on" : undefined
}

const countSwitches: readonly {
  names: readonly string[]
  many: string
  one: string | null
}[] = [
  { names: ["resultType"], many: "series", one: "single" },
  { names: ["sequentialImageGeneration"], many: "auto", one: null },
]

export type CountSwitch = {
  field: Extract<ModelField, { kind: "choice" }>
  many: string
  one: string | null
}

/** Finds the choice a model needs set before its count field makes more than one result, such as a series switch. */
export function countSwitchOf(
  fields: readonly ModelField[]
): CountSwitch | null {
  for (const field of fields) {
    if (field.kind !== "choice") {
      continue
    }
    const found = countSwitches.find((one) =>
      one.names.some((name) => keysOf(field).includes(settingKeyOf(name)))
    )
    if (
      found !== undefined &&
      field.options.some((one) => String(one) === found.many) &&
      (found.one === null ||
        field.options.some((one) => String(one) === found.one))
    ) {
      return { field, many: found.many, one: found.one }
    }
  }
  return null
}

const preferredValues: Partial<Record<NormalSetting, readonly string[]>> = {
  format: ["auto", "adaptive"],
  quality: ["auto", "high", "final", "pro", "quality"],
  length: ["5", "5s"],
  scale: ["2", "2x"],
}

const preferredNumbers: Partial<Record<NormalSetting, number>> = {
  length: 5,
  count: 1,
  scale: 2,
}

function clamped(
  field: Extract<ModelField, { kind: "number" }>,
  value: number
) {
  return Math.min(field.max ?? value, Math.max(field.min ?? value, value))
}

/** Gives the value a shown setting opens on: the model's default, else the table's, else the first option. */
export function shownDefaultOf(
  field: ModelField,
  setting: NormalSetting
): string | number | undefined {
  const own = modelValueOf(field)
  if (own !== undefined && own !== "") {
    return own
  }
  if (field.kind === "choice") {
    const preferred = (preferredValues[setting] ?? []).find((value) =>
      field.options.some((one) => String(one).toLowerCase() === value)
    )
    return (
      field.options.find((one) => String(one).toLowerCase() === preferred) ??
      field.options[0]
    )
  }
  if (field.kind === "number") {
    const preferred = preferredNumbers[setting]
    return preferred === undefined ? undefined : clamped(field, preferred)
  }
  return undefined
}
