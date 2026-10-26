import {
  keyOf,
  numberIn,
  type RateRow,
  type RunFacts,
  sizeClassOf,
} from "#infrastructure/router/router-rate-match"

export type Amounts = { credits: readonly number[]; exact: boolean }

type TokenTable = {
  source: string
  readOn: string
  models: readonly string[]
  tokens: Readonly<Record<string, number>>
}

const geminiPricing = "https://ai.google.dev/gemini-api/docs/pricing"

const openAiImages =
  "https://developers.openai.com/api/docs/guides/image-generation"

/**
 * The output tokens one image costs, as each maker publishes it, keyed by
 * its size class, or by its quality and its shape. Input tokens are not
 * counted, so a price read through this table is an estimate.
 */
const tokenTables: readonly TokenTable[] = [
  {
    source: geminiPricing,
    readOn: "2026-10-26",
    models: ["vertexai/gemini-2.5-flash-image"],
    tokens: { "1k": 1290 },
  },
  {
    source: geminiPricing,
    readOn: "2026-10-26",
    models: ["vertexai/gemini-3.1-flash-lite-image"],
    tokens: { "1k": 1120 },
  },
  {
    source: geminiPricing,
    readOn: "2026-10-26",
    models: ["vertexai/gemini-nano-banana-2.1"],
    tokens: { "1k": 1120, "2k": 1680, "4k": 3780 },
  },
  {
    source: openAiImages,
    readOn: "2026-10-26",
    models: ["openai/gpt-image-1", "openai/gpt-image-1.5"],
    tokens: {
      "low/square": 272,
      "low/portrait": 408,
      "low/landscape": 400,
      "medium/square": 1056,
      "medium/portrait": 1584,
      "medium/landscape": 1568,
      "high/square": 4160,
      "high/portrait": 6240,
      "high/landscape": 6208,
    },
  },
]

type UnitTable = {
  source: string
  readOn: string
  units: Readonly<Record<string, number>>
}

/** The Recraft credits, its API units, one image costs per model, from Recraft's own price list. */
const recraftUnits: UnitTable = {
  source: "https://www.recraft.ai/docs/api-reference/pricing",
  readOn: "2026-10-26",
  units: {
    "recraft/recraftv2": 22,
    "recraft/recraftv3": 40,
    "recraft/recraftv4": 40,
    "recraft/recraftv4_pro": 250,
    "recraft/recraftv4_1": 35,
    "recraft/recraftv4_1_utility": 35,
    "recraft/recraftv4_1_pro": 210,
    "recraft/recraftv4_1_utility_pro": 210,
    "recraft/recraftv4_1_vector": 80,
    "recraft/recraftv4_1_utility_vector": 80,
    "recraft/recraftv4_1_pro_vector": 300,
    "recraft/recraftv4_1_utility_pro_vector": 300,
    "recraft/recraftv4_styles": 35,
    "recraft/recraftv4_styles_pro": 100,
    "recraft/recraftv4_styles_vector": 50,
    "recraft/recraftv4_styles_pro_vector": 120,
  },
}

const perOutput =
  /^per (request|generation|image|output image|generated image|completed operation)$/

const outputImageTokens = /^output image tokens$/i

/** Units that add to a run's price for each input it is given. */
const perInput =
  /^per (input image|reference image|additional reference image)$/

const perTime: readonly string[] = [
  "per second",
  "per 5 seconds",
  "per minute",
  "per 30 output frames, rounded up",
]

/** Says whether a unit counts the run's seconds. */
export function isPerTime(unit: string): boolean {
  return perTime.includes(unit)
}

export function isPerInput(unit: string): boolean {
  return perInput.test(unit)
}

const numberWords: readonly string[] = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
]

/**
 * The inputs a per-input row bills of the images a run carries. A row read
 * as "after the first" bills the images past one, and "after the first five"
 * the images past five. A row that bills additional images and names no free
 * count bills every image, and is not exact.
 */
export function billedInputsOf(
  row: RateRow,
  images: number
): { count: number; exact: boolean } {
  const after = /after the first(?:\s+(\w+))?/i.exec(row.conditions)
  const free = after === null ? 0 : countIn(after[1] ?? "one")
  const additional = /additional/i.test(`${row.unit} ${row.conditions}`)
  if (free === null || (additional && after === null)) {
    return { count: images, exact: false }
  }
  return { count: Math.max(0, images - free), exact: true }
}

function countIn(word: string): number | null {
  const lower = word.toLowerCase()
  if (/^\d+$/.test(lower)) {
    return Number(lower)
  }
  const at = numberWords.indexOf(lower)
  return at >= 0 ? at : null
}

/** Says whether a row's unit converts to credits for one run. */
export function isPriced(row: RateRow): boolean {
  if (isPerTime(row.unit)) {
    return true
  }
  switch (row.unit) {
    case "per 1M tokens":
      return outputImageTokens.test(row.conditions.trim())
    case "per Recraft credit":
      return Object.hasOwn(recraftUnits.units, row.model)
    default:
      return perOutput.test(row.unit)
  }
}

/** Converts one row to the credits of one run, once per value a setting the run leaves open could take. */
export function amountsOf(
  row: RateRow,
  run: RunFacts,
  count: number
): Amounts | null {
  if (perOutput.test(row.unit)) {
    return { credits: [row.credits * count], exact: true }
  }
  if (row.unit === "per 1M tokens") {
    const tokens = tokensOf(run)
    return tokens.length === 0
      ? null
      : {
          credits: tokens.map((one) => (row.credits * one * count) / 1e6),
          exact: false,
        }
  }
  if (row.unit === "per Recraft credit") {
    const units = recraftUnits.units[row.model]
    return units === undefined
      ? null
      : { credits: [row.credits * units * count], exact: true }
  }
  const seconds = run.seconds ?? secondsIn(row.conditions)
  if (seconds === null) {
    return null
  }
  const units = timeUnitsOf(row.unit, seconds, numberIn(run.values, ["fps"]))
  return units === null
    ? null
    : { credits: [row.credits * units * count], exact: true }
}

function timeUnitsOf(
  unit: string,
  seconds: number,
  fps: number | null
): number | null {
  switch (unit) {
    case "per 5 seconds":
      return Math.ceil(seconds / 5)
    case "per minute":
      return seconds / 60
    case "per 30 output frames, rounded up":
      return fps === null ? null : Math.ceil((seconds * fps) / 30)
    default:
      return seconds
  }
}

function tokensOf(run: RunFacts): number[] {
  const table = tokenTables.find((one) => one.models.includes(run.model))
  if (table === undefined) {
    return []
  }
  const keys = Object.keys(table.tokens)
  const wanted = tokenKeyOf(
    run,
    keys.some((key) => key.includes("/"))
  )
  const matched = keys.filter((key) =>
    key.split("/").every((part, at) => {
      const known = wanted[at]
      return known === null || known === undefined || known === part
    })
  )
  const kept = keys.length === 1 ? keys : matched
  return kept.flatMap((key) => {
    const tokens = table.tokens[key]
    return tokens === undefined ? [] : [tokens]
  })
}

function tokenKeyOf(run: RunFacts, byShape: boolean): (string | null)[] {
  const { values } = run
  if (byShape) {
    const size = values.get("size") ?? null
    return [values.get("quality") ?? null, size === null ? null : shapeOf(size)]
  }
  const sized =
    values.get("outputsize") ??
    values.get("imagesize") ??
    values.get("resolution") ??
    null
  return [sized === null ? null : (sizeClassOf(sized) ?? keyOf(sized))]
}

function shapeOf(size: string): string | null {
  const sized = /^(\d+)x(\d+)$/.exec(size)
  if (sized === null) {
    return null
  }
  const width = Number(sized[1])
  const height = Number(sized[2])
  if (width === height) {
    return "square"
  }
  return width > height ? "landscape" : "portrait"
}

function secondsIn(conditions: string): number | null {
  const found = /(?:^|;\s*)(\d+)s(?:;|$)/.exec(conditions)
  return found === null ? null : Number(found[1])
}
