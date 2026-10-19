import { Clock } from "#clock/clock.port"

export class SystemClock extends Clock {
  override now(): Date {
    return new Date()
  }
}
