export class BitWriter {
  private readonly bytes: number[] = []
  private current = 0
  private filled = 0

  bit(value: number): void {
    this.current = (this.current << 1) | (value & 1)
    this.filled += 1
    if (this.filled === 8) {
      this.bytes.push(this.current)
      this.current = 0
      this.filled = 0
    }
  }

  bits(value: number, count: number): void {
    for (let shift = count - 1; shift >= 0; shift -= 1) {
      this.bit(Math.floor(value / 2 ** shift) % 2)
    }
  }

  ue(value: number): void {
    const code = value + 1
    const length = 31 - Math.clz32(code)
    this.bits(0, length)
    this.bits(code, length + 1)
  }

  se(value: number): void {
    this.ue(value > 0 ? 2 * value - 1 : -2 * value)
  }

  finish(): Uint8Array {
    this.bit(1)
    while (this.filled !== 0) {
      this.bit(0)
    }
    return Uint8Array.from(this.bytes)
  }
}
