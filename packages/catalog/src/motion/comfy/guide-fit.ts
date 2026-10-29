import { shortSides } from "#motion/comfy/motion-binding"

export type FrameSize = { width: number; height: number }

export const guideCropLimit = 0.1

const sideStep = 64

function roundHalfToEven(value: number): number {
  const nearest = Math.round(value)
  return nearest - value === 0.5 && nearest % 2 !== 0 ? nearest - 1 : nearest
}

export function renderSizeOf(
  photo: FrameSize,
  resolution: string
): FrameSize | null {
  const shortSide = shortSides[resolution]
  const short = Math.min(photo.width, photo.height)
  if (shortSide === undefined || short <= 0) {
    return null
  }
  const sideOf = (side: number): number =>
    roundHalfToEven((side * shortSide) / short / sideStep) * sideStep
  return { width: sideOf(photo.width), height: sideOf(photo.height) }
}

export function guideCropOf(guide: FrameSize, render: FrameSize): number {
  const guideRatio = guide.width / guide.height
  const renderRatio = render.width / render.height
  return (
    1 - Math.min(guideRatio, renderRatio) / Math.max(guideRatio, renderRatio)
  )
}

export function isGuideFit(guide: FrameSize, render: FrameSize): boolean {
  return guideCropOf(guide, render) <= guideCropLimit
}
