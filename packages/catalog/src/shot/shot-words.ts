export const shotLists = {
  movement: [
    "static",
    "push-in",
    "pull-out",
    "track-left",
    "track-right",
    "crane-up",
    "crane-down",
    "pan-left",
    "pan-right",
    "tilt-up",
    "tilt-down",
  ],
  camera: ["digital", "film-35mm", "film-16mm", "video-tape", "phone"],
  lens: ["wide-angle", "standard", "telephoto", "macro", "anamorphic"],
  focus: ["shallow", "deep"],
  light: [
    "daylight",
    "golden-hour",
    "overcast",
    "night",
    "studio",
    "low-key",
    "high-key",
  ],
  color: ["warm", "cool", "muted", "vivid", "black-and-white", "sepia"],
  mood: ["calm", "tense", "joyful", "somber", "eerie", "tender"],
} as const

export type ShotList = keyof typeof shotLists

export const shotListOrder: readonly ShotList[] = [
  "movement",
  "camera",
  "lens",
  "focus",
  "light",
  "color",
  "mood",
]

export const autoValue = "auto"

export const shotPhrases: Readonly<
  Record<ShotList, Readonly<Record<string, string>>>
> = {
  movement: {
    static: "The camera holds still.",
    "push-in": "The camera moves slowly toward the subject.",
    "pull-out": "The camera moves slowly back from the subject.",
    "track-left": "The camera slides sideways to the left.",
    "track-right": "The camera slides sideways to the right.",
    "crane-up": "The camera rises slowly upward.",
    "crane-down": "The camera lowers slowly downward.",
    "pan-left": "The camera turns slowly to the left.",
    "pan-right": "The camera turns slowly to the right.",
    "tilt-up": "The camera tilts slowly upward.",
    "tilt-down": "The camera tilts slowly downward.",
  },
  camera: {
    digital: "Shot on a digital camera with a clean image.",
    "film-35mm": "Shot on 35mm film with fine grain.",
    "film-16mm": "Shot on 16mm film with visible grain.",
    "video-tape": "Recorded on video tape with soft detail.",
    phone: "Recorded on a phone camera.",
  },
  lens: {
    "wide-angle": "Shot on a wide-angle lens.",
    standard: "Shot on a standard lens.",
    telephoto: "Shot on a telephoto lens.",
    macro: "Shot on a macro lens, very close to the subject.",
    anamorphic: "Shot on an anamorphic lens with a wide frame.",
  },
  focus: {
    shallow: "Shallow focus with a blurred background.",
    deep: "Deep focus, sharp from front to back.",
  },
  light: {
    daylight: "Natural daylight.",
    "golden-hour": "Warm, low sunlight just before sunset.",
    overcast: "Soft, even light from an overcast sky.",
    night: "Night lighting.",
    studio: "Even studio lighting.",
    "low-key": "Low-key lighting with deep shadows.",
    "high-key": "High-key lighting, bright with few shadows.",
  },
  color: {
    warm: "Warm colors.",
    cool: "Cool colors.",
    muted: "Muted colors.",
    vivid: "Vivid, saturated colors.",
    "black-and-white": "Black and white, with no color.",
    sepia: "Sepia tones, like an old photograph.",
  },
  mood: {
    calm: "A calm mood.",
    tense: "A tense mood.",
    joyful: "A joyful mood.",
    somber: "A somber mood.",
    eerie: "An eerie mood.",
    tender: "A tender mood.",
  },
}

export const sceneEnd: RegExp = /(?<![.!?])$/

export type ShotChoices = Readonly<Partial<Record<ShotList, string>>>

type SentWordsOptions = {
  scene: string
  choices: ShotChoices
}

export function sceneSentence(scene: string): string {
  return scene.trim().replace(sceneEnd, ".")
}

export function phraseOf(list: ShotList, value: string | undefined): string {
  if (value === undefined || value === autoValue) {
    return ""
  }
  const phrase = shotPhrases[list][value]
  return phrase === undefined ? "" : ` ${phrase}`
}

export function sentWords(options: SentWordsOptions): string {
  const phrases = shotListOrder.map((list) =>
    phraseOf(list, options.choices[list])
  )
  return `${sceneSentence(options.scene)}${phrases.join("")}`
}

export function keyOf(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase()
  )
}
