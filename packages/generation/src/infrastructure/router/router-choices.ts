import {
  arrayOf,
  fieldOf,
  type Schema,
  stringOf,
} from "#infrastructure/router/router-json"

type Option = string | number

const item = String.raw`(?:"[^"]+"|'[^']+'|[A-Za-z0-9][A-Za-z0-9:._x*+/-]*)(?: \([^)]*\))?`

const joined = new RegExp(`^${item}(?:, ${item})*(?:,? (?:or|and) ${item})$`)

const listed = new RegExp(`^${item}(?:, ${item})+$`)

const leads: readonly RegExp[] = [
  /\b(?:options|supported values|optional values|possible values)(?: are|:)\s+/gi,
  /\b(?:one of|either|can be)\s+/gi,
]

const labelled = /:\s+/g

const example =
  /\b(?:for example|for instance|e\.g\.?|such as|like|including|examples?)\s*$/i

const sentenceEnd = /\.(?:\s|$)|\n|;/

function itemsOf(segment: string, needsJoin: boolean): string[] | null {
  const text = segment.trim()
  if (!(joined.test(text) || (!needsJoin && listed.test(text)))) {
    return null
  }
  const found = text.match(new RegExp(item, "g")) ?? []
  const words = found
    .map((one) =>
      one
        .replace(/ \([^)]*\)$/, "")
        .replace(/^["']|["']$/g, "")
        .trim()
    )
    .filter((one) => one !== "or" && one !== "and" && one !== "")
  return words.length >= 2 ? words : null
}

function segmentsAfter(text: string, lead: RegExp): string[] {
  const segments: string[] = []
  for (const match of text.matchAll(lead)) {
    if (example.test(text.slice(0, match.index ?? 0))) {
      continue
    }
    const rest = text.slice((match.index ?? 0) + match[0].length)
    segments.push(rest.split(sentenceEnd)[0] ?? "")
  }
  return segments
}

/** Reads the values a schema lists in words in its description, or null when it lists none or several lists. */
export function listedOptions(description: string): string[] | null {
  const text = description.replace(/\s+/g, " ")
  const lists = [
    ...leads.flatMap((lead) =>
      segmentsAfter(text, lead).map((segment) => itemsOf(segment, false))
    ),
    ...segmentsAfter(text, labelled).map((segment) => itemsOf(segment, true)),
  ].filter((list): list is string[] => list !== null)
  const distinct = new Set(lists.map((list) => list.join("\n")))
  const [only] = lists
  return distinct.size === 1 && only !== undefined ? only : null
}

const exampleLead = /\b(?:for example|for instance|e\.g\.?|such as)[,:]?\s+/gi

const exampleEnd = /\.(?:\s|$)|\n|;|\)/

/** Reads the values a free text property names as its examples, with its own example value, or an empty list when it names fewer than two. */
export function namedOptions(schema: Schema): Option[] {
  const description = (stringOf(fieldOf(schema, "description")) ?? "").replace(
    /\s+/g,
    " "
  )
  const lists = [...description.matchAll(exampleLead)]
    .map((match) =>
      itemsOf(
        description
          .slice((match.index ?? 0) + match[0].length)
          .split(exampleEnd)[0] ?? "",
        false
      )
    )
    .filter((list): list is string[] => list !== null)
  const [only] = lists
  if (lists.length !== 1 || only === undefined) {
    return []
  }
  const example = fieldOf(schema, "example")
  return uniqueOptions(typeof example === "string" ? [...only, example] : only)
}

/** Keeps the first spelling of each value that the schema lists twice in different case. */
export function uniqueOptions(options: readonly Option[]): Option[] {
  const seen = new Set<string>()
  return options.filter((option) => {
    const key = String(option).toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/** Reads the values a property takes, from its enum or else from its description. */
export function optionsOf(schema: Schema): Option[] {
  const enumerated = (arrayOf(fieldOf(schema, "enum")) ?? []).filter(
    (one): one is Option => typeof one === "string" || typeof one === "number"
  )
  if (enumerated.length > 0) {
    return uniqueOptions(enumerated)
  }
  const type = fieldOf(schema, "type")
  if (type !== undefined && type !== "string") {
    return []
  }
  return uniqueOptions(
    listedOptions(stringOf(fieldOf(schema, "description")) ?? "") ?? []
  )
}

/** Finds the option a default names, in the option's own spelling, or null. */
export function optionNamed(
  options: readonly Option[],
  value: unknown
): Option | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null
  }
  const key = String(value).toLowerCase()
  return options.find((option) => String(option).toLowerCase() === key) ?? null
}
