import { createNodePhotonImages } from "@earendil-works/pi-durable/images/node"
import type { ImageProcessor } from "@earendil-works/pi-durable/tools"
import type { ImagesOf } from "#infrastructure/pi-asset-media"

let opened: Promise<ImageProcessor> | null = null

/** Photon on bun, in a worker thread opened on the first image that needs scaling and closed when idle. */
export const photonImages: ImagesOf = () => {
  opened ??= createNodePhotonImages()
  return opened
}
