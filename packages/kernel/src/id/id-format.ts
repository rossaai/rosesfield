import { InvalidIdError } from "#error/invalid-id.error"

type IdFormatOptions = {
  name: string
  pattern: RegExp
}

export class IdFormat<Id extends string> {
  static readonly uuidPattern: RegExp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
  static readonly kebabCasePattern: RegExp = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

  readonly name: string
  readonly pattern: RegExp

  constructor(options: IdFormatOptions) {
    this.name = options.name
    this.pattern = options.pattern
  }

  readonly is = (value: unknown): value is Id =>
    typeof value === "string" && this.pattern.test(value)

  parse(value: string): Id {
    if (this.is(value)) {
      return value
    }
    throw new InvalidIdError({ name: this.name, value })
  }
}
