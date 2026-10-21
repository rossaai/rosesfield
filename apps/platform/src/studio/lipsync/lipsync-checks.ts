import type { ModelField } from "@rosesfield/catalog/comfy"
import { formatBytes, formatSeconds } from "@/copy/format"
import { tCatalog } from "@/copy/t"
import type { FieldProblem } from "@/screens/app/app-form"
import type { LengthLimit } from "@/studio/lipsync/lipsync-tabs"

export type MediaFacts = {
  mime: string
  bytes: number
  width: number | null
  height: number | null
  seconds: number | null
}

export type WellKind = "photo" | "clip" | "audio"

export type Limits = {
  input: string
  maxBytes: number
  mimes: readonly string[]
  formatsKey: string
  unreadableKey: string
  needs: { size: boolean; length: boolean }
  seconds: LengthLimit | null
}

type KindLimits = Omit<Limits, "input" | "seconds">

const kindLimits: Readonly<Record<WellKind, KindLimits>> = {
  photo: {
    maxBytes: 20_000_000,
    mimes: ["image/png", "image/jpeg", "image/webp"],
    formatsKey: "lipsync.formats.photo",
    unreadableKey: "lipsync.input.photo.unreadable",
    needs: { size: true, length: false },
  },
  clip: {
    maxBytes: 100_000_000,
    mimes: ["video/mp4", "video/quicktime", "video/webm"],
    formatsKey: "lipsync.formats.clip",
    unreadableKey: "lipsync.input.clip.unreadable",
    needs: { size: true, length: true },
  },
  audio: {
    maxBytes: 20_000_000,
    mimes: [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
    ],
    formatsKey: "lipsync.formats.audio",
    unreadableKey: "lipsync.input.audio.unreadable",
    needs: { size: false, length: true },
  },
}

export function limitsFor(
  kind: WellKind,
  input: string,
  seconds: LengthLimit | null
): Limits {
  return {
    ...kindLimits[kind],
    input,
    seconds: kind === "photo" ? null : seconds,
  }
}

const ratios: readonly { value: string; width: number; height: number }[] = [
  { value: "1:1", width: 1, height: 1 },
  { value: "4:3", width: 4, height: 3 },
  { value: "3:4", width: 3, height: 4 },
  { value: "16:9", width: 16, height: 9 },
  { value: "9:16", width: 9, height: 16 },
]

export function nearestRatio(
  width: number,
  height: number,
  offered: readonly string[]
): string | null {
  const shape = Math.log(width / height)
  let best: string | null = null
  let bestGap = Number.POSITIVE_INFINITY
  for (const ratio of ratios) {
    const gap = Math.abs(shape - Math.log(ratio.width / ratio.height))
    if (offered.includes(ratio.value) && gap < bestGap) {
      best = ratio.value
      bestGap = gap
    }
  }
  return best
}

function lengthProblem(seconds: number, limits: Limits): FieldProblem | null {
  if (limits.seconds === null) {
    return null
  }
  const rounded = Math.round(seconds * 10) / 10
  const shown = formatSeconds(rounded)
  if (rounded > limits.seconds.max) {
    return {
      name: limits.input,
      key: "field.asset.tooLong",
      values: { seconds: shown, max: limits.seconds.max },
    }
  }
  if (rounded < limits.seconds.min) {
    return {
      name: limits.input,
      key: "field.asset.tooShort",
      values: { seconds: shown, min: limits.seconds.min },
    }
  }
  return null
}

export function problemOf(
  facts: MediaFacts,
  limits: Limits
): FieldProblem | null {
  if (!limits.mimes.includes(facts.mime)) {
    return {
      name: limits.input,
      key: "field.asset.wrongKind",
      values: { kinds: tCatalog(limits.formatsKey) },
    }
  }
  if (facts.bytes > limits.maxBytes) {
    return {
      name: limits.input,
      key: "field.asset.tooLarge",
      values: {
        size: formatBytes(facts.bytes),
        limit: formatBytes(limits.maxBytes),
      },
    }
  }
  const sizeUnread =
    limits.needs.size && (facts.width === null || facts.height === null)
  if (sizeUnread || (limits.needs.length && facts.seconds === null)) {
    return {
      name: limits.input,
      key: "field.asset.wrongKind",
      values: { kinds: tCatalog(limits.unreadableKey) },
    }
  }
  return facts.seconds === null ? null : lengthProblem(facts.seconds, limits)
}

function numberLength(
  seconds: number,
  field: Extract<ModelField, { kind: "number" }>
): number {
  const wanted = field.integer
    ? Math.ceil(seconds - 0.05)
    : Math.round(seconds * 100) / 100
  return Math.min(field.max ?? wanted, Math.max(field.min ?? wanted, wanted))
}

function choiceLength(
  seconds: number,
  field: Extract<ModelField, { kind: "choice" }>
): string | number | null {
  const options = field.options
    .map((option) => ({ option, value: Number.parseFloat(String(option)) }))
    .filter((one) => Number.isFinite(one.value))
    .sort((a, b) => a.value - b.value)
  const fits = options.find((one) => one.value >= seconds - 0.05)
  return (fits ?? options.at(-1))?.option ?? null
}

export function lengthFor(
  seconds: number,
  field: ModelField
): string | number | null {
  switch (field.kind) {
    case "number":
      return numberLength(seconds, field)
    case "choice":
      return choiceLength(seconds, field)
    default:
      return null
  }
}
