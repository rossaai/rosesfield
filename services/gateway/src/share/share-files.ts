export type ByteRange = {
  start: number
  end: number
}

export type FilePart = {
  body: ReadableStream<Uint8Array>
  size: number
  range: ByteRange
}

export type ShareFiles = {
  read: (key: string, range: ByteRange | null) => Promise<FilePart | null>
  size: (key: string) => Promise<number | null>
}

export function wholeOrPart(size: number, range: ByteRange | null): ByteRange {
  return range === null
    ? { start: 0, end: size - 1 }
    : { start: range.start, end: Math.min(range.end, size - 1) }
}
