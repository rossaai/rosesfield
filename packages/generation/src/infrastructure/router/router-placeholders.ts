import type { InputValue, RunInputs } from "@rosesfield/contract"
import { assetIdFormat } from "@rosesfield/kernel"
import type { EngineFile } from "#domain/generation-engine.port"
import type { MediaKind, ModelForm } from "#domain/model-form"
import { writeFlatMp4 } from "#infrastructure/demo/flat-mp4"
import { writeFlatPng } from "#infrastructure/demo/flat-png"
import { writeSilentWav } from "#infrastructure/demo/silent-wav"

export type Placed = {
  inputs: RunInputs
  files: EngineFile[]
}

const side = 64

export async function placeholdersOf(
  form: ModelForm,
  inputs: RunInputs
): Promise<Placed> {
  const placed: Record<string, InputValue> = { ...inputs }
  const files: EngineFile[] = []
  for (const field of form.fields) {
    if (field.kind !== "media") {
      continue
    }
    const given = inputs[field.name]
    const named = Array.isArray(given) ? given : []
    const count =
      named.length > 0 ? named.length : field.required ? field.min : 0
    const ids = Array.from({ length: count }, () =>
      assetIdFormat.parse(crypto.randomUUID())
    )
    for (const assetId of ids) {
      files.push({ assetId, ...(await placeholderOf(field.media)) })
    }
    if (ids.length > 0) {
      placed[field.name] = ids
    }
  }
  return { inputs: placed, files }
}

async function placeholderOf(
  media: MediaKind
): Promise<Omit<EngineFile, "assetId">> {
  switch (media) {
    case "image":
      return {
        kind: "image",
        mime: "image/png",
        bytes: await writeFlatPng({ width: side, height: side, gray: 128 }),
      }
    case "video":
      return {
        kind: "video",
        mime: "video/mp4",
        bytes: writeFlatMp4({ width: side, height: side, seconds: 1 }),
      }
    case "audio":
      return {
        kind: "audio",
        mime: "audio/wav",
        bytes: writeSilentWav({ seconds: 1, sampleRate: 16_000 }),
      }
  }
}
