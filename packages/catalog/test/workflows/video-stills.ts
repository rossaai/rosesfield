import { z } from "zod"

const graphNode = z.object({
  class_type: z.string(),
  inputs: z.record(z.string(), z.unknown()),
})

const link = z.tuple([z.string(), z.number()])

export const stillClasses = [
  "GetImageSize",
  "ComfyMathExpression",
  "ImageFromBatch",
  "ImageScaleToTotalPixels",
  "SaveImage",
]

const stillChain: readonly [string, string][] = [
  ["SaveImage", "images"],
  ["ImageScaleToTotalPixels", "image"],
  ["ImageFromBatch", "batch_index"],
  ["ComfyMathExpression", "values.a"],
]

function nodeOf(graph: Record<string, unknown>, id: string) {
  const parsed = graphNode.safeParse(graph[id])
  return parsed.success ? parsed.data : null
}

function chainOf(graph: Record<string, unknown>, save: string): string[] {
  const ids = [save]
  let at = save
  for (const [type, input] of stillChain) {
    const node = nodeOf(graph, at)
    const next = link.safeParse(node?.inputs[input])
    if (node?.class_type !== type || !next.success) {
      return []
    }
    at = next.data[0]
    ids.push(at)
  }
  return nodeOf(graph, at)?.class_type === "GetImageSize" ? ids : []
}

export function stillSavesOf(graph: Record<string, unknown>): string[] {
  return Object.keys(graph).filter((id) => {
    const prefix = nodeOf(graph, id)?.inputs.filename_prefix
    return typeof prefix === "string" && prefix.startsWith("rosesfield-stills/")
  })
}

export function withoutVideoStills<Node>(
  graph: Record<string, Node>
): Record<string, Node> {
  const still = new Set(
    stillSavesOf(graph).flatMap((save) => chainOf(graph, save))
  )
  return Object.fromEntries(
    Object.entries(graph).filter(([id]) => !still.has(id))
  )
}
