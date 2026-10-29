import type { GuideFiles } from "#effect-guides/guide-files"
import flipIntoANewPlace from "./files/flip-into-a-new-place.mp4"
import grabAndRun from "./files/grab-and-run.mp4"
import ticketWipe from "./files/ticket-wipe.mp4"

const bundled: Readonly<Record<string, unknown>> = {
  "flip-into-a-new-place.mp4": flipIntoANewPlace,
  "grab-and-run.mp4": grabAndRun,
  "ticket-wipe.mp4": ticketWipe,
}

export function bundledGuideFiles(
  files: Readonly<Record<string, unknown>> = bundled
): GuideFiles {
  return {
    read: async (file) => {
      const bytes = Object.hasOwn(files, file) ? files[file] : undefined
      return bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : null
    },
  }
}
