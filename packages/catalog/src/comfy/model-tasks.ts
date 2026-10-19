export type ModelTask =
  | "text-to-image"
  | "image-edit"
  | "text-to-video"
  | "image-to-video"
  | "video-edit"
  | "lip-sync"
  | "speech"
  | "sound"
  | "three-d"
  | "upscale"
  | "background"
  | "relight"
  | "try-on"
  | "expand"
  | "chat"

type MediaRule = {
  task: ModelTask
  takes: readonly string[]
  makes: string
  without?: readonly string[]
}

type NameRule = {
  task: ModelTask
  pattern: RegExp
}

export const modelTasks: readonly ModelTask[] = [
  "text-to-image",
  "image-edit",
  "text-to-video",
  "image-to-video",
  "video-edit",
  "lip-sync",
  "speech",
  "sound",
  "three-d",
  "upscale",
  "background",
  "relight",
  "try-on",
  "expand",
  "chat",
]

export const mediaRules: readonly MediaRule[] = [
  { task: "text-to-image", takes: ["text"], makes: "image" },
  { task: "image-edit", takes: ["image"], makes: "image" },
  { task: "text-to-video", takes: ["text"], makes: "video" },
  { task: "image-to-video", takes: ["image"], makes: "video" },
  { task: "video-edit", takes: ["video"], makes: "video" },
  { task: "lip-sync", takes: ["audio", "video"], makes: "video" },
  { task: "speech", takes: ["text"], makes: "audio", without: ["video"] },
  { task: "three-d", takes: [], makes: "3d" },
  {
    task: "chat",
    takes: ["text"],
    makes: "text",
    without: ["image", "video", "audio", "3d"],
  },
]

export const nameRules: readonly NameRule[] = [
  {
    task: "upscale",
    pattern: /upscal|increase-resolution|seedvr|flashvsr|enhance/,
  },
  { task: "background", pattern: /background|green-screen/ },
  { task: "relight", pattern: /relight/ },
  { task: "try-on", pattern: /vto|try-on/ },
  { task: "expand", pattern: /expand|outpaint/ },
  { task: "lip-sync", pattern: /lip-sync|lipsync|sync-3|avatar/ },
  { task: "sound", pattern: /sfx|sound-effect/ },
]

export function tasksOfModel(
  id: string,
  takes: readonly string[],
  makes: readonly string[]
): ModelTask[] {
  const fromMedia = mediaRules
    .filter(
      (rule) =>
        makes.includes(rule.makes) &&
        rule.takes.every((one) => takes.includes(one)) &&
        !(rule.without ?? []).some((one) => makes.includes(one))
    )
    .map((rule) => rule.task)
  const fromName = nameRules
    .filter((rule) => rule.pattern.test(id))
    .map((rule) => rule.task)
  return modelTasks.filter(
    (task) => fromMedia.includes(task) || fromName.includes(task)
  )
}
