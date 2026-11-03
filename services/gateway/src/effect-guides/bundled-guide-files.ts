import type { GuideFiles } from "#effect-guides/guide-files"
import catchTheTruck from "./files/catch-the-truck.mp4"
import catchTheTruckMatte from "./files/catch-the-truck-matte.mp4"
import flipIntoANewPlace from "./files/flip-into-a-new-place.mp4"
import grabAndRun from "./files/grab-and-run.mp4"
import grabAndRunMatte from "./files/grab-and-run-matte.mp4"
import ticketWipe from "./files/ticket-wipe.mp4"

const bundled: Readonly<Record<string, unknown>> = {
  "catch-the-truck.mp4": catchTheTruck,
  "catch-the-truck-matte.mp4": catchTheTruckMatte,
  "flip-into-a-new-place.mp4": flipIntoANewPlace,
  "grab-and-run.mp4": grabAndRun,
  "grab-and-run-matte.mp4": grabAndRunMatte,
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
