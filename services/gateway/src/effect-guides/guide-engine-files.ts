import { type HeldFile, libraryExamples } from "@rosesfield/catalog/motion"
import type { EngineFiles } from "@rosesfield/generation"
import type { GuideFiles } from "#effect-guides/guide-files"

const guideMime = "video/mp4"

export async function sha256Of(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes))
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

function recordedGuides(): ReadonlyMap<string, HeldFile> {
  return new Map(
    libraryExamples.flatMap(({ guide }) =>
      guide === null
        ? []
        : [guide, ...(guide.matte === null ? [] : [guide.matte])].map(
            (held): [string, HeldFile] => [held.file, held]
          )
    )
  )
}

export function guideEngineFiles(
  files: GuideFiles,
  guides: ReadonlyMap<string, HeldFile> = recordedGuides()
): EngineFiles {
  return {
    read: async (name) => {
      const guide = guides.get(name)
      const bytes = guide === undefined ? null : await files.read(name)
      if (guide === undefined || bytes === null) {
        return null
      }
      return (await sha256Of(bytes)) === guide.sha256
        ? { mime: guideMime, bytes }
        : null
    },
  }
}
