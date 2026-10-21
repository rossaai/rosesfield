import type { ComfyValueBinding } from "@rosesfield/generation/bindings"
import type { TraitName } from "#characters/traits"

type Fragments = Record<string, string>

type Link = [nodeId: string, output: number]

export type WordNode = {
  class_type: "StringConcatenate"
  inputs: { string_a: string | Link; string_b: string; delimiter: string }
}

export type TraitWords = {
  nodes: Readonly<Record<string, WordNode>>
  bindings: readonly ComfyValueBinding[]
  output: Link
}

const framing: Fragments = {
  portrait: "Head and shoulders portrait photograph of one person",
  "half-body": "Half-body photograph of one person, framed from the waist up",
  "full-body": "Full-body photograph of one person, head to feet in the frame",
}

const traits: Record<TraitName, Fragments> = {
  gender: {
    auto: "",
    woman: ", a woman",
    man: ", a man",
    androgynous: ", an androgynous person",
  },
  age: {
    auto: "",
    "young-adult": ", a young adult in their twenties",
    adult: ", an adult in their thirties",
    "middle-aged": ", middle-aged, in their fifties",
    older: ", an older adult in their seventies",
  },
  skinTone: {
    auto: "",
    "very-light": ", very light skin",
    light: ", light skin",
    medium: ", medium skin",
    olive: ", olive skin",
    brown: ", brown skin",
    dark: ", dark skin",
  },
  bodyType: {
    auto: "",
    slim: ", slim build",
    average: ", average build",
    athletic: ", athletic build",
    broad: ", broad build",
  },
  hairLength: {
    auto: "",
    bald: ", a bald head",
    short: ", short hair",
    medium: ", medium-length hair",
    long: ", long hair",
  },
  hairStyle: {
    auto: "",
    straight: ", straight hair",
    wavy: ", wavy hair",
    curly: ", curly hair",
    coily: ", coily hair",
    braided: ", braided hair",
  },
  hairColor: {
    auto: "",
    black: ", black hair",
    brown: ", brown hair",
    blond: ", blond hair",
    red: ", red hair",
    grey: ", grey hair",
    white: ", white hair",
  },
  eyeColor: {
    auto: "",
    brown: ", brown eyes",
    hazel: ", hazel eyes",
    green: ", green eyes",
    blue: ", blue eyes",
    grey: ", grey eyes",
  },
  outfit: {
    auto: "",
    casual: ", wearing casual clothes",
    formal: ", wearing formal clothes",
    sportswear: ", wearing sportswear",
    workwear: ", wearing workwear",
    outdoor: ", wearing outdoor clothes",
  },
}

const background: Fragments = {
  on: ", in front of a plain light grey studio background",
  off: ", in a natural setting",
}

const sourceReady =
  ", neutral expression, looking straight at the camera, front view, soft even light, sharp focus"

type Step = TraitName | "plainBackground"

const chain: readonly Step[] = [
  "age",
  "skinTone",
  "bodyType",
  "hairLength",
  "hairStyle",
  "hairColor",
  "eyeColor",
  "outfit",
  "plainBackground",
]

const firstWordNode = 8101

function idOf(index: number): string {
  return String(firstWordNode + index)
}

function linkTo(index: number): Link {
  return [idOf(index), 0]
}

function wordNode(from: string | Link, words = "", delimiter = ""): WordNode {
  return {
    class_type: "StringConcatenate",
    inputs: { string_a: from, string_b: words, delimiter },
  }
}

function wordBinding(
  name: string,
  map: Fragments,
  node: string,
  field: "string_a" | "string_b"
): ComfyValueBinding {
  return { from: "input", name, map: { ...map }, path: [node, "inputs", field] }
}

function fragmentsOf(step: Step): Fragments {
  return step === "plainBackground" ? background : traits[step]
}

function hairWiring(): Record<string, Link> {
  const withHair = linkTo(chain.indexOf("hairColor") + 1)
  const bald = linkTo(chain.indexOf("hairLength") + 1)
  return Object.fromEntries(
    Object.keys(traits.hairLength).map((value) => [
      value,
      value === "bald" ? bald : withHair,
    ])
  )
}

export function traitWords(): TraitWords {
  const lead = idOf(0)
  const nodes: Record<string, WordNode> = { [lead]: wordNode("") }
  const bindings: ComfyValueBinding[] = [
    wordBinding("framing", framing, lead, "string_a"),
    wordBinding("gender", traits.gender, lead, "string_b"),
  ]
  chain.forEach((step, index) => {
    const node = idOf(index + 1)
    nodes[node] = wordNode(linkTo(index))
    bindings.push(wordBinding(step, fragmentsOf(step), node, "string_b"))
  })
  const suffix = idOf(chain.length + 1)
  nodes[suffix] = wordNode(linkTo(chain.length), sourceReady)
  const details = idOf(chain.length + 2)
  nodes[details] = wordNode([suffix, 0], "", ". ")
  bindings.push(
    {
      from: "input",
      name: "hairLength",
      map: hairWiring(),
      path: [idOf(chain.indexOf("eyeColor") + 1), "inputs", "string_a"],
    },
    { from: "input", name: "details", path: [details, "inputs", "string_b"] }
  )
  return { nodes, bindings, output: [details, 0] }
}

const skippedWhenBald: readonly Step[] = ["hairStyle", "hairColor"]

function fragmentOf(map: Fragments, value: unknown, fallback: string): string {
  const key =
    typeof value === "string" && Object.hasOwn(map, value) ? value : fallback
  return map[key] ?? ""
}

export function traitPrompt(inputs: Readonly<Record<string, unknown>>): string {
  const isBald = inputs.hairLength === "bald"
  const lead =
    fragmentOf(framing, inputs.framing, "half-body") +
    fragmentOf(traits.gender, inputs.gender, "auto")
  const words = chain
    .filter((step) => !(isBald && skippedWhenBald.includes(step)))
    .map((step) =>
      fragmentOf(
        fragmentsOf(step),
        inputs[step],
        step === "plainBackground" ? "on" : "auto"
      )
    )
    .join("")
  const details = typeof inputs.details === "string" ? inputs.details : ""
  const base = `${lead}${words}${sourceReady}`
  return details === "" ? base : `${base}. ${details}`
}
