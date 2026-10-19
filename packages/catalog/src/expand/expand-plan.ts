export type Size = { width: number; height: number }

export type Shares = {
  top: number
  right: number
  bottom: number
  left: number
}

export type Pads = Shares

export type Plan = {
  canvas: Size
  photo: Size
  pads: Pads
  isScaled: boolean
}

export type FormatCheck =
  | { state: "fits"; plan: Plan }
  | { state: "same" }
  | { state: "tooFar"; axis: "width" | "height"; times: number }

export type SidesCheck = { state: "fits"; plan: Plan } | { state: "noSpace" }

export const expandLimits = {
  maxLongSide: 1536,
  maxTimes: 3,
  sameTolerance: 0.02,
  step: 8,
  workingStep: 16,
} as const

const noShares: Shares = { top: 0, right: 0, bottom: 0, left: 0 }

function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5)
}

function upToStep(value: number): number {
  const step = expandLimits.step
  return Math.ceil(value / step - 0.000001) * step
}

function limitSide(side: number, other: number): number {
  const step = expandLimits.step
  const scale = Math.min(1, expandLimits.maxLongSide / Math.max(side, other))
  return roundHalfUp((side * scale) / step) * step
}

function photoSide(
  side: number,
  other: number,
  canvasSide: number,
  canvasOther: number
): number {
  const scale = Math.min(canvasSide / side, canvasOther / other, 1)
  return Math.min(canvasSide, roundHalfUp(side * scale))
}

function padFirst(extra: number, first: number, second: number): number {
  const even = 1 - Math.min(1, first + second)
  return roundHalfUp((extra * (first + even / 2)) / (first + second + even))
}

function ratioOf(format: string): Size {
  const [width = "1", height = "1"] = format.split(":")
  return { width: Number(width), height: Number(height) }
}

export function planOf(photo: Size, raw: Size, shares: Shares): Plan {
  const roundedWidth = upToStep(raw.width)
  const roundedHeight = upToStep(raw.height)
  const width = limitSide(roundedWidth, roundedHeight)
  const height = limitSide(roundedHeight, roundedWidth)
  const photoWidth = photoSide(photo.width, photo.height, width, height)
  const photoHeight = photoSide(photo.height, photo.width, height, width)
  const left = padFirst(width - photoWidth, shares.left, shares.right)
  const top = padFirst(height - photoHeight, shares.top, shares.bottom)
  return {
    canvas: { width, height },
    photo: { width: photoWidth, height: photoHeight },
    pads: {
      top,
      right: width - photoWidth - left,
      bottom: height - photoHeight - top,
      left,
    },
    isScaled: Math.max(roundedWidth, roundedHeight) > expandLimits.maxLongSide,
  }
}

export function formatCanvasOf(photo: Size, format: string): Size {
  const ratio = ratioOf(format)
  return {
    width: Math.max(photo.width, (photo.height * ratio.width) / ratio.height),
    height: Math.max(photo.height, (photo.width * ratio.height) / ratio.width),
  }
}

export function sidesCanvasOf(photo: Size, shares: Shares): Size {
  return {
    width: photo.width + (photo.width * (shares.left + shares.right)) / 100,
    height: photo.height + (photo.height * (shares.top + shares.bottom)) / 100,
  }
}

export function formatCheckOf(photo: Size, format: string): FormatCheck {
  const ratio = ratioOf(format)
  const photoRatio = photo.width / photo.height
  const formatRatio = ratio.width / ratio.height
  if (Math.abs(photoRatio / formatRatio - 1) <= expandLimits.sameTolerance) {
    return { state: "same" }
  }
  const raw = formatCanvasOf(photo, format)
  const widthTimes = raw.width / photo.width
  const heightTimes = raw.height / photo.height
  if (widthTimes > expandLimits.maxTimes) {
    return { state: "tooFar", axis: "width", times: widthTimes }
  }
  if (heightTimes > expandLimits.maxTimes) {
    return { state: "tooFar", axis: "height", times: heightTimes }
  }
  return { state: "fits", plan: planOf(photo, raw, noShares) }
}

export function hasNoSpace(shares: Shares): boolean {
  return shares.top + shares.right + shares.bottom + shares.left === 0
}

export function sidesCheckOf(photo: Size, shares: Shares): SidesCheck {
  if (hasNoSpace(shares)) {
    return { state: "noSpace" }
  }
  return {
    state: "fits",
    plan: planOf(photo, sidesCanvasOf(photo, shares), shares),
  }
}

export function workingSizeOf(canvas: Size): Size {
  const step = expandLimits.workingStep
  const long = Math.max(canvas.width, canvas.height)
  const side = (value: number): number =>
    roundHalfUp((value * expandLimits.maxLongSide) / long / step) * step
  return { width: side(canvas.width), height: side(canvas.height) }
}

export function nearestRatioOf(
  ratios: readonly string[],
  size: Size
): string | null {
  const target = Math.log(size.width / size.height)
  let best: string | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const ratio of ratios) {
    const { width, height } = ratioOf(ratio)
    const distance = Math.abs(Math.log(width / height) - target)
    if (distance < bestDistance) {
      best = ratio
      bestDistance = distance
    }
  }
  return best
}

export type PhotoProblem =
  | { kind: "wrongKind" }
  | { kind: "tooLarge"; bytes: number; limit: number }
  | { kind: "tooSmall"; side: number; min: number }

export const photoLimits = {
  formats: ["image/png", "image/jpeg", "image/webp"],
  maxBytes: 20_000_000,
  minShortSide: 256,
} as const

export function photoProblemOf(facts: {
  mime: string
  bytes: number
  width: number | null
  height: number | null
}): PhotoProblem | null {
  if (!photoLimits.formats.some((format) => format === facts.mime)) {
    return { kind: "wrongKind" }
  }
  if (facts.bytes > photoLimits.maxBytes) {
    return { kind: "tooLarge", bytes: facts.bytes, limit: photoLimits.maxBytes }
  }
  if (facts.width !== null && facts.height !== null) {
    const side = Math.min(facts.width, facts.height)
    if (side < photoLimits.minShortSide) {
      return { kind: "tooSmall", side, min: photoLimits.minShortSide }
    }
  }
  return null
}
