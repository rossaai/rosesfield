const previewFiles = import.meta.glob<string>("./previews/*.mp4", {
  eager: true,
  query: "?url",
  import: "default",
})

export function previewOf(file: string): string | null {
  return previewFiles[`./previews/${file}`] ?? null
}
