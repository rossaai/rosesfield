/** The base64 text of the bytes, read in chunks so a large file does not overflow the call stack. */
export function base64Of(bytes: Uint8Array): string {
  const chunk = 0x8000
  let text = ""
  for (let start = 0; start < bytes.length; start += chunk) {
    text += String.fromCharCode(...bytes.subarray(start, start + chunk))
  }
  return btoa(text)
}
