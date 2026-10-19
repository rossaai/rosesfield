import { routes } from "@rosesfield/contract"
import { callRoute } from "@/api/call-route"

export type PixelSize = { width: number; height: number }

export async function bitmapOf(assetId: string): Promise<ImageBitmap> {
  const blob = await callRoute(routes.readAssetContent, {
    params: { assetId },
  })
  return createImageBitmap(blob)
}

export async function sizeOfAsset(assetId: string): Promise<PixelSize | null> {
  try {
    const bitmap = await bitmapOf(assetId)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return null
  }
}

function pngOf(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("The canvas gave no PNG"))
        return
      }
      resolve(blob)
    }, "image/png")
  })
}

function canvasOf(size: PixelSize): {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
} {
  const canvas = document.createElement("canvas")
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext("2d")
  if (context === null) {
    throw new Error("The browser gave no 2D canvas")
  }
  return { canvas, context }
}

export async function flattenLayers(
  assetIds: readonly string[]
): Promise<Blob | null> {
  const bitmaps = await Promise.all(assetIds.map(bitmapOf))
  const [first] = bitmaps
  if (first === undefined) {
    return null
  }
  const size = { width: first.width, height: first.height }
  const { canvas, context } = canvasOf(size)
  for (const bitmap of bitmaps) {
    context.drawImage(bitmap, 0, 0, size.width, size.height)
    bitmap.close()
  }
  return pngOf(canvas)
}

export async function maskPngOf(
  painted: HTMLCanvasElement,
  size: PixelSize
): Promise<Blob> {
  const { canvas, context } = canvasOf(size)
  context.fillStyle = "#000000"
  context.fillRect(0, 0, size.width, size.height)
  context.drawImage(painted, 0, 0, size.width, size.height)
  const pixels = context.getImageData(0, 0, size.width, size.height)
  for (let index = 0; index < pixels.data.length; index += 4) {
    const value = (pixels.data[index] ?? 0) >= 128 ? 255 : 0
    pixels.data[index] = value
    pixels.data[index + 1] = value
    pixels.data[index + 2] = value
    pixels.data[index + 3] = 255
  }
  context.putImageData(pixels, 0, 0)
  return pngOf(canvas)
}

export function hasPaint(painted: HTMLCanvasElement): boolean {
  const context = painted.getContext("2d")
  if (context === null || painted.width === 0 || painted.height === 0) {
    return false
  }
  const { data } = context.getImageData(0, 0, painted.width, painted.height)
  for (let index = 3; index < data.length; index += 4) {
    if ((data[index] ?? 0) > 0) {
      return true
    }
  }
  return false
}
