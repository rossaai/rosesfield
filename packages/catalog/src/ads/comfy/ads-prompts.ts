import type { KindValue, StyleValue } from "#ads/ads-values"
import type { WorkflowValueBinding } from "#workflow-binding"
import type { apiGraph } from "#workflow-entry.contract"
import { WorkflowInvalidError } from "#workflow-invalid.error"

export type ApiGraph = ReturnType<typeof apiGraph.parse>

export const stylePhrases: Readonly<Record<StyleValue, string>> = {
  studio: "A studio shot on a seamless light gray backdrop, soft even light.",
  lifestyle: "The product in use in a lived-in home, in natural window light.",
  outdoor: "The product outdoors on a sunny day, with green plants behind it.",
  "flat-lay":
    "A flat lay seen from straight above, with a few related objects.",
  minimal: "A minimal scene: one plain color background and one soft shadow.",
  bold: "Bold saturated color blocks behind the product and hard, crisp shadows.",
}

export const kindLeads: Readonly<Record<KindValue, string>> = {
  "product-shot": "A product photo of the product shown in the pictures. ",
  ad: "An ad image of the product shown in the pictures. ",
}

export const wordsLeads: Readonly<Record<KindValue, string>> = {
  "product-shot": " ",
  ad: ' Print exactly these words on the image, and no other words: "',
}

export const lineLeads: Readonly<Record<KindValue, string>> = {
  "product-shot": "",
  ad: '", and on a second line in smaller letters: "',
}

export const wordsEnd = '". '

export const quoteCleanups: Readonly<Record<KindValue, string>> = {
  "product-shot": '(?<=\\.)\\s*"\\.|"(?=\\.)',
  ad: "(?!)",
}

export const keepRule =
  "Keep the product's shape, color and label exactly as in the product pictures."

export const personRule =
  " The last picture shows a person. That person presents the product."

export const linkPattern = "https?://\\S+"

export const lineBreakPattern = "\\s*\\n\\s*"

const textFlags = {
  case_insensitive: true,
  multiline: false,
  dotall: false,
  count: 0,
}

export function nodeInputs(
  graph: ApiGraph,
  workflow: string,
  id: string
): Record<string, unknown> {
  const node = graph[id]
  if (node === undefined) {
    throw new WorkflowInvalidError({
      folder: workflow,
      reason: `the Ads patch needs node ${id}`,
    })
  }
  return node.inputs
}

export function promptPatch(
  graph: ApiGraph,
  workflow: string,
  hasPerson: boolean
): ApiGraph {
  const inputsOf = (id: string) => nodeInputs(graph, workflow, id)
  Object.assign(inputsOf("506"), { string_a: ["505", 0], string_b: ["502", 0] })
  Object.assign(inputsOf("507"), { string_a: "", string_b: "" })
  graph["524"] = {
    class_type: "RegexReplace",
    inputs: {
      string: ["507", 0],
      regex_pattern: linkPattern,
      replace: "",
      ...textFlags,
    },
  }
  graph["523"] = {
    class_type: "StringTrim",
    inputs: { string: ["524", 0], mode: "Both" },
  }
  Object.assign(inputsOf("503"), {
    string: ["523", 0],
    regex_pattern: "^(?=.)",
    replace: "",
    dotall: true,
  })
  graph["520"] = {
    class_type: "StringConcatenate",
    inputs: { string_a: ["506", 0], string_b: ["503", 0], delimiter: "" },
  }
  graph["521"] = {
    class_type: "StringConcatenate",
    inputs: { string_a: ["520", 0], string_b: wordsEnd, delimiter: "" },
  }
  Object.assign(inputsOf("508"), {
    string_a: ["521", 0],
    string_b: hasPerson ? `${keepRule}${personRule}` : keepRule,
  })
  Object.assign(inputsOf("509"), { replace: "" })
  graph["522"] = {
    class_type: "RegexReplace",
    inputs: {
      string: ["509", 0],
      regex_pattern: lineBreakPattern,
      replace: " ",
      ...textFlags,
    },
  }
  inputsOf("510").string = ["522", 0]
  return graph
}

export const promptBindings: readonly WorkflowValueBinding[] = [
  { from: "input", name: "scene", to: "prompt" },
  { from: "input", name: "headline", to: "prompt" },
  { from: "input", name: "line", to: "wordsEnd" },
  { from: "input", name: "kind", map: kindLeads, to: "kindLead" },
  { from: "input", name: "style", map: stylePhrases, to: "style" },
  { from: "input", name: "kind", map: wordsLeads, to: "wordsLead" },
  { from: "input", name: "kind", map: lineLeads, to: "lineBreak" },
  { from: "input", name: "kind", map: quoteCleanups, to: "doubledStop" },
]
