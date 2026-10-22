export const maxScenes = 8
export const sceneMaxLength = 500
export const lookMaxLength = 300

export const referenceLimits = {
  maxBytes: 20_000_000,
  minShortSide: 480,
  mimes: ["image/png", "image/jpeg", "image/webp"],
} as const

export type StoryboardModel = "qwen-image-edit-2511"

export const editModel: StoryboardModel = "qwen-image-edit-2511"

export const editTask = "image-edit"

export const textTask = "text-to-image"

export const keyframeInput = "keyframe"

export const firstKeyframeInput = "firstKeyframe"

export const storyboardModels: readonly StoryboardModel[] = [
  "qwen-image-edit-2511",
]

const modelKeys: Readonly<Record<StoryboardModel, string>> = {
  "qwen-image-edit-2511": "qwenImageEdit2511",
}

export const sceneCountInput = "sceneCount"

export const sceneNumbers: readonly number[] = Array.from(
  { length: maxScenes },
  (_, index) => index + 1
)

export const sceneCounts: readonly string[] = sceneNumbers.map(String)

const countWords: readonly string[] = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
]

export function sceneCountWord(count: number): string {
  return countWords[count - 1] ?? "one"
}

export function sceneInputName(number: number): string {
  return `scene${number}`
}

export function countsFrom(number: number): string[] {
  return sceneCounts.slice(number - 1)
}

export function keyframeNumberOf(value: unknown): number | null {
  const number = typeof value === "string" ? Number(value) : Number.NaN
  return Number.isInteger(number) && number >= 1 && number <= maxScenes
    ? number
    : null
}

export function modelKeyOf(model: StoryboardModel): string {
  return modelKeys[model]
}
