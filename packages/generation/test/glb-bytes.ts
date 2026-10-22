export function glbBytes(): Uint8Array {
  const json = new TextEncoder().encode('{"asset":{"version":"2.0"}} ')
  const total = 20 + json.length
  const bytes = new Uint8Array(total)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, total, true)
  view.setUint32(12, json.length, true)
  view.setUint32(16, 0x4e4f534a, true)
  bytes.set(json, 20)
  return bytes
}
