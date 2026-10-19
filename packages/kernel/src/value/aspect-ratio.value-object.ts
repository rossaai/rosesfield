import { InvalidAspectRatioError } from "#error/invalid-aspect-ratio.error"

type AspectRatioOptions = {
  width: number
  height: number
}

export class AspectRatio {
  static readonly pattern: RegExp = /^([1-9][0-9]?):([1-9][0-9]?)$/

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

  toString(): string {
    return `${this.width}:${this.height}`
  }
}
