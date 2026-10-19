const sources = import.meta.glob<string>(
  ["../src/tokens.css", "../src/styles/motion.css"],
  { query: "?raw", import: "default", eager: true }
)

export function readSource(path: string): string {
  const text = sources[`../src/${path}`]
  if (text === undefined) {
    throw new Error(`no source at ${path}`)
  }
  return text
}
