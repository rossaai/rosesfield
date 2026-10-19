import { Clock } from "#clock/clock.port"

type FixedClockOptions = {
  now: Date
}

export class FixedClock extends Clock {
  private time: number

  constructor(options: FixedClockOptions) {
    super()
    this.time = options.now.getTime()
  }

  override now(): Date {
    return new Date(this.time)
  }

  advance(milliseconds: number): void {
    this.time += milliseconds
  }
}
