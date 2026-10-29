import { InvalidAspectRatioError } from "#error/invalid-aspect-ratio.error"

type AspectRatioOptions = {
  width: number
  height: number
}

export class AspectRatio {
  static readonly pattern: RegExp = /^([1-9][0-9]?):([1-9][0-9]?)$/

  static readonly maxTerm = 99

  readonly width: number
  readonly height: number

  private constructor(options: AspectRatioOptions) {
    this.width = options.width
    this.height = options.height
  }

  static isValid(text: string): boolean {
    return AspectRatio.pattern.test(text)
  }

  static parse(text: string): AspectRatio {
    const match = AspectRatio.pattern.exec(text)
    if (match?.[1] === undefined || match[2] === undefined) {
      throw new InvalidAspectRatioError({ text })
    }
    return new AspectRatio({
      width: Number(match[1]),
      height: Number(match[2]),
    })
  }

  static ofSize(width: number, height: number): AspectRatio | null {
    if (!(width > 0 && height > 0)) {
      return null
    }
    const real = width / height
    let best: AspectRatio | null = null
    let bestError = Number.POSITIVE_INFINITY
    for (let tall = 1; tall <= AspectRatio.maxTerm; tall += 1) {
      const wide = Math.round(real * tall)
      const error = Math.abs(wide / tall - real)
      if (
        wide >= 1 &&
        wide <= AspectRatio.maxTerm &&
        error < bestError - 1e-9
      ) {
        best = new AspectRatio({ width: wide, height: tall })
        bestError = error
      }
    }
    return best
  }

  toString(): string {
    return `${this.width}:${this.height}`
  }
}
