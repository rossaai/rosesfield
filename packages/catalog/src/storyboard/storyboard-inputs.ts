export const maxScenes = 8
export const sceneMaxLength = 500
export const lookMaxLength = 300

export const referenceLimits = {
  maxBytes: 20_000_000,
  minShortSide: 480,
  mimes: ["image/png", "image/jpeg", "image/webp"],
} as const

export type StoryboardModel = "qwen-image-edit-2511" | "flux-2-klein-4b"

export const storyboardModels: readonly StoryboardModel[] = [
  "qwen-image-edit-2511",
  "flux-2-klein-4b",
]

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

export function modelKeyOf(model: StoryboardModel): string {
  return model === "qwen-image-edit-2511" ? "qwenImageEdit2511" : "flux2Klein4b"
}
