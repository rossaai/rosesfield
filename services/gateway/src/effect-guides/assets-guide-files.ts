import { type GuideFiles, guidePath } from "#effect-guides/guide-files"

const assetsOrigin = "https://assets.local"

export function assetsGuideFiles(assets: Fetcher): GuideFiles {
  return {
    read: async (file) => {
      const response = await assets.fetch(
        new Request(new URL(`${guidePath}${file}`, assetsOrigin).href)
      )
      return response.ok ? new Uint8Array(await response.arrayBuffer()) : null
    },
  }
}
