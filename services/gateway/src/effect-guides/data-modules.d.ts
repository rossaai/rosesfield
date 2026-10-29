declare module "*.mp4" {
  const bytes: unknown
  // biome-ignore lint/style/noDefaultExport: wrangler gives a Data module one default export
  export default bytes
}
