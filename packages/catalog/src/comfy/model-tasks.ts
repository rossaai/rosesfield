import {
  type FieldRole,
  fieldRoleOf,
  type HostedModel,
  type ModelField,
} from "@rosesfield/generation/bindings"

export type ModelTask =
  | "text-to-image"
  | "image-edit"
  | "text-to-video"
  | "image-to-video"
  | "reference-to-video"
  | "first-last-frame"
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

type Slot = FieldRole | "video" | "audio" | "mask"

type MediaRule = {
  task: ModelTask
  takes: readonly string[]
  makes: string
  gives: readonly Slot[]
  without?: readonly string[]
  needs?: readonly FieldRole[]
}

type NameRule = {
  task: ModelTask
  pattern: RegExp
  media?: "kept"
}

export const modelTasks: readonly ModelTask[] = [
  "text-to-image",
  "image-edit",
  "text-to-video",
  "image-to-video",
  "reference-to-video",
  "first-last-frame",
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

const imageRoles: readonly FieldRole[] = [
  "first-frame",
  "last-frame",
  "reference",
]

export const mediaRules: readonly MediaRule[] = [
  { task: "text-to-image", takes: ["text"], makes: "image", gives: [] },
  {
    task: "image-edit",
    takes: ["image"],
    makes: "image",
    gives: [...imageRoles, "mask"],
  },
  { task: "text-to-video", takes: ["text"], makes: "video", gives: [] },
  {
    task: "image-to-video",
    takes: ["image"],
    makes: "video",
    gives: ["first-frame"],
    needs: ["first-frame"],
  },
  {
    task: "reference-to-video",
    takes: ["image"],
    makes: "video",
    gives: ["reference"],
    needs: ["reference"],
  },
  {
    task: "first-last-frame",
    takes: ["image"],
    makes: "video",
    gives: ["first-frame", "last-frame"],
    needs: ["first-frame", "last-frame"],
  },
  { task: "video-edit", takes: ["video"], makes: "video", gives: ["video"] },
  {
    task: "lip-sync",
    takes: ["audio", "video"],
    makes: "video",
    gives: ["video", "audio", ...imageRoles],
  },
  {
    task: "speech",
    takes: ["text"],
    makes: "audio",
    gives: ["audio"],
    without: ["video"],
  },
  { task: "three-d", takes: [], makes: "3d", gives: imageRoles },
  {
    task: "chat",
    takes: ["text"],
    makes: "text",
    gives: imageRoles,
    without: ["image", "video", "audio", "3d"],
  },
]

export const nameRules: readonly NameRule[] = [
  {
    task: "upscale",
    pattern: /upscal|increase-resolution|seedvr|flashvsr|enhance/,
  },
  { task: "background", pattern: /background|green-screen/, media: "kept" },
  { task: "relight", pattern: /relight/ },
  { task: "try-on", pattern: /vto|try-on/ },
  { task: "expand", pattern: /expand|outpaint/ },
  { task: "lip-sync", pattern: /lip-sync|lipsync|sync-3|avatar/ },
  { task: "sound", pattern: /sfx|sound-effect/ },
]

function slotOf(field: ModelField, output: string): Slot | null {
  if (field.kind !== "media") {
    return null
  }
  if (field.media !== "image") {
    return field.media
  }
  return fieldRoleOf(field, output) ?? "mask"
}

function slotsOf(
  model: HostedModel,
  output: string
): { all: Slot[]; needed: Slot[] } {
  const fields = model.form?.fields ?? []
  const all = fields.flatMap((field) => {
    const slot = slotOf(field, output)
    return slot === null ? [] : [slot]
  })
  const needed = fields.flatMap((field) => {
    const slot = field.required ? slotOf(field, output) : null
    return slot === null ? [] : [slot]
  })
  return { all, needed }
}

function fits(model: HostedModel, rule: MediaRule): boolean {
  const { takes, makes } = model
  if (
    !makes.includes(rule.makes) ||
    !rule.takes.every((one) => takes.includes(one)) ||
    (rule.without ?? []).some((one) => makes.includes(one))
  ) {
    return false
  }
  const slots = slotsOf(model, rule.makes)
  return (
    slots.needed.every((slot) => rule.gives.includes(slot)) &&
    (rule.needs ?? []).every((role) => slots.all.includes(role))
  )
}

function keepsMedia(model: HostedModel, media: string | null): boolean {
  const kept = media === null ? model.takes : [media]
  return kept.some(
    (one) => model.takes.includes(one) && model.makes.includes(one)
  )
}

function fitsName(
  model: HostedModel,
  rule: NameRule,
  media: string | null
): boolean {
  return (
    rule.pattern.test(model.id) &&
    (rule.media !== "kept" || keepsMedia(model, media))
  )
}

/** Lists the tasks a model can run, from the media it takes and makes, the inputs its form needs and, for an app that makes the given media, the tasks that keep that media. */
export function tasksOfModel(
  model: HostedModel,
  media: string | null = null
): ModelTask[] {
  const fromMedia = mediaRules
    .filter((rule) => fits(model, rule))
    .map((rule) => rule.task)
  const fromName = nameRules
    .filter((rule) => fitsName(model, rule, media))
    .map((rule) => rule.task)
  return modelTasks.filter(
    (task) => fromMedia.includes(task) || fromName.includes(task)
  )
}
