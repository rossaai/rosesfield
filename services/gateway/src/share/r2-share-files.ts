import { R2AssetStore } from "#infrastructure/r2-asset-store"
import { type ShareFiles, wholeOrPart } from "#share/share-files"

export function r2ShareFiles(bucket: R2Bucket): ShareFiles {
  const keyOf = (key: string): string => `${R2AssetStore.prefix}${key}`
  return {
    size: async (key) => (await bucket.head(keyOf(key)))?.size ?? null,
    read: async (key, range) => {
      const head = await bucket.head(keyOf(key))
      if (head === null) {
        return null
      }
      const part = wholeOrPart(head.size, range)
      const object = await bucket.get(keyOf(key), {
        range: { offset: part.start, length: part.end - part.start + 1 },
      })
      return object === null
        ? null
        : { body: object.body, size: head.size, range: part }
    },
  }
}
