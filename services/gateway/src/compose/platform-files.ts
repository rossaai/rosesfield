import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { MiddlewareHandler } from "hono"
import { serveStatic } from "hono/bun"

export async function pageOf(root: string): Promise<string | null> {
  try {
    return await readFile(join(root, "index.html"), "utf8")
  } catch {
    return null
  }
}

export function platformFiles(root: string): MiddlewareHandler[] {
  return [serveStatic({ root }), serveStatic({ root, path: "index.html" })]
}
