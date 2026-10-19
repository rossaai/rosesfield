import type { TraitName } from "#characters/traits"
import type { WorkflowValueBinding } from "#workflow-binding"

type Fragments = Record<string, string>

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

const chain: readonly (TraitName | "plainBackground" | "suffix")[] = [
  "age",
  "skinTone",
  "bodyType",
  "hairLength",
  "hairStyle",
  "hairColor",
  "eyeColor",
  "outfit",
  "plainBackground",
  "suffix",
]

const firstId = 101

function idOf(index: number): string {
  return String(firstId + index)
}

const hairLengthIndex = chain.indexOf("hairLength")
const hairColorIndex = chain.indexOf("hairColor")

function textBinding(name: string, map: Fragments): WorkflowValueBinding {
  return { from: "input", name, map, to: name }
}

export function traitsPromptBindings(): WorkflowValueBinding[] {
  const bindings: WorkflowValueBinding[] = [
    { from: "input", name: "framing", map: framing, to: "framing" },
    textBinding("gender", traits.gender),
  ]
  chain.forEach((step) => {
    if (step === "suffix") {
      return
    }
    const map = step === "plainBackground" ? background : traits[step]
    bindings.push(textBinding(step, map))
  })
  bindings.push(
    { from: "input", name: "hairLength", map: hairWiring(), to: "hairWiring" },
    { from: "input", name: "details", to: "details" }
  )
  return bindings
}

function hairWiring(): Record<string, [string, number]> {
  const withHair: [string, number] = [idOf(hairColorIndex + 1), 0]
  const bald: [string, number] = [idOf(hairLengthIndex + 1), 0]
  return Object.fromEntries(
    Object.keys(traits.hairLength).map((value) => [
      value,
      value === "bald" ? bald : withHair,
    ])
  )
}

export const traitFragments = { framing, traits, background, sourceReady }
