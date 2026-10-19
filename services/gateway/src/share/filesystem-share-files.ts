import { join } from "node:path"
import { type ShareFiles, wholeOrPart } from "#share/share-files"

export function filesystemShareFiles(root: string): ShareFiles {
  const fileOf = (key: string) => Bun.file(join(root, key))
  return {
    size: async (key) => {
      const file = fileOf(key)
      return (await file.exists()) ? file.size : null
    },
    read: async (key, range) => {
      const file = fileOf(key)
      if (!(await file.exists())) {
        return null
      }
      const part = wholeOrPart(file.size, range)
      return {
        body: file.slice(part.start, part.end + 1).stream(),
        size: file.size,
        range: part,
      }
    },
  }
}
