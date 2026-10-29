import { formatList } from "@/copy/format"
import { tCatalogCount } from "@/copy/t"

/** The one sentence under a draft that names, by their place in the well, the photos that matched nothing in your video. */
export function leftOutText(photos: readonly number[]): string {
  return tCatalogCount("motion.chain.leftOut", photos.length, {
    photos: formatList(photos.map((at) => String(at + 1))),
  })
}
