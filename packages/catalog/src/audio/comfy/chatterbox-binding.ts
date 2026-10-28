import type { EngineBinding } from "@rosesfield/contract"
import { selectBinding } from "@rosesfield/generation/bindings"
import { type WorkflowValueBinding, workflowBinding } from "#workflow-binding"
import { apiGraph } from "#workflow-entry.contract"

export const voiceWorkflow = "voice-chatterbox"

export const voiceModes = ["model", "recording"] as const

export type VoiceMode = (typeof voiceModes)[number]

export const voiceLanguages = {
  ar: "Arabic (ar)",
  da: "Danish (da)",
  de: "German (de)",
  el: "Greek (el)",
  en: "English (en)",
  es: "Spanish (es)",
  fi: "Finnish (fi)",
  fr: "French (fr)",
  he: "Hebrew (he)",
  hi: "Hindi (hi)",
  it: "Italian (it)",
  ja: "Japanese (ja)",
  ko: "Korean (ko)",
  ms: "Malay (ms)",
  nl: "Dutch (nl)",
  no: "Norwegian (no)",
  pl: "Polish (pl)",
  pt: "Portuguese (pt)",
  ru: "Russian (ru)",
  sv: "Swedish (sv)",
  sw: "Swahili (sw)",
  tr: "Turkish (tr)",
  zh: "Chinese (zh)",
} as const

export type VoiceLanguage = keyof typeof voiceLanguages

export const voiceLanguageValues: readonly VoiceLanguage[] = [
  "ar",
  "da",
  "de",
  "el",
  "en",
  "es",
  "fi",
  "fr",
  "he",
  "hi",
  "it",
  "ja",
  "ko",
  "ms",
  "nl",
  "no",
  "pl",
  "pt",
  "ru",
  "sv",
  "sw",
  "tr",
  "zh",
]

const scriptSeconds = { plus: 2, max: 40 } as const

const logographicLanguages: readonly VoiceLanguage[] = ["ja", "zh"]

const syllabicLanguages: readonly VoiceLanguage[] = ["ko"]

function secondsPerCharacter(language: VoiceLanguage): number {
  if (logographicLanguages.includes(language)) {
    return 0.3
  }
  return syllabicLanguages.includes(language) ? 0.2 : 0.12
}

export const voiceSecondsPerCharacter: Readonly<Record<string, number>> =
  Object.fromEntries(
    voiceLanguageValues.map((language) => [
      language,
      secondsPerCharacter(language),
    ])
  )

const speechNode = "1"
const recordingNode = "2"

const shared: readonly WorkflowValueBinding[] = [
  { from: "input", name: "script", to: "script" },
  {
    from: "input",
    name: "language",
    map: { ...voiceLanguages },
    to: "language",
  },
  { from: "input", name: "expression", to: "expression" },
  { from: "seed", to: "seed" },
  {
    from: "inputLength",
    name: "script",
    rate: { input: "language", map: voiceSecondsPerCharacter },
    ...scriptSeconds,
    to: "length",
  },
]

export function withoutRecording(
  workflow: Record<string, unknown>
): Record<string, unknown> {
  const graph = apiGraph.parse(workflow)
  delete graph[recordingNode]
  const speech = graph[speechNode]
  if (speech !== undefined) {
    delete speech.inputs.audio_prompt
  }
  return graph
}

export const chatterboxSpeechBinding: EngineBinding = workflowBinding({
  workflow: voiceWorkflow,
  bindings: shared,
  outputsPerJob: "one",
  patch: withoutRecording,
})

export const chatterboxCloneBinding: EngineBinding = workflowBinding({
  workflow: voiceWorkflow,
  bindings: [
    ...shared,
    { from: "input", name: "recording", index: 0, to: "voice" },
  ],
  outputsPerJob: "one",
})

export const voiceBinding: EngineBinding = selectBinding({
  input: "recording",
  by: "filled",
  options: {
    filled: chatterboxCloneBinding,
    empty: chatterboxSpeechBinding,
  },
})
