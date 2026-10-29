import { z } from "zod"
import source from "./cloud-weights.json"

const loader = z.strictObject({
  input: z.string().min(1),
  pack: z.string().min(1).optional(),
  files: z.array(z.string().min(1)),
})

export const cloudWeightsFile = z.strictObject({
  source: z.string().min(1),
  readOn: z.iso.date(),
  recipe: z.string().min(1),
  loaders: z.record(z.string(), loader),
})

export type CloudWeightsFile = z.infer<typeof cloudWeightsFile>

export const cloudWeights: CloudWeightsFile = cloudWeightsFile.parse(source)

export function heldFilesOf(
  data: CloudWeightsFile = cloudWeights
): ReadonlySet<string> {
  return new Set(Object.values(data.loaders).flatMap((one) => one.files))
}

export function isHeldOnCloud(
  files: readonly string[],
  held: ReadonlySet<string>
): boolean {
  return files.every((file) => held.has(file))
}
