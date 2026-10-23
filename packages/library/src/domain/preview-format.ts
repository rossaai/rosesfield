export type PreviewFormat = "image/webp" | "image/jpeg" | "image/png"

type Signature = {
  format: PreviewFormat
  bytes: readonly (number | null)[]
}

const anyByte = null

const signatures: readonly Signature[] = [
  {
    format: "image/webp",
    bytes: [
      0x52,
      0x49,
      0x46,
      0x46,
      anyByte,
      anyByte,
      anyByte,
      anyByte,
      0x57,
      0x45,
      0x42,
      0x50,
    ],
  },
  { format: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { format: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a] },
]

export function previewFormatOf(bytes: Uint8Array): PreviewFormat | null {
  const found = signatures.find((signature) =>
    signature.bytes.every(
      (expected, at) => expected === anyByte || bytes[at] === expected
    )
  )
  return found?.format ?? null
}
