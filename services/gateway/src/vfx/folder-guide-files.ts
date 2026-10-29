import { join } from "node:path"
import type { GuideFiles } from "#vfx/guide-files"

export function folderGuideFiles(root: string): GuideFiles {
  return {
    read: async (file) => {
      const found = Bun.file(join(root, file))
      return (await found.exists()) ? new Uint8Array(await found.bytes()) : null
    },
  }
}
