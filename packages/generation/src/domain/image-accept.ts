import type {
  AppDefinition,
  ImageAccept,
  RunInputs,
} from "@rosesfield/contract"
import { imageSizeOf } from "#domain/image-size"

export type ReadImage = (
  assetId: string
) => Promise<{ mime: string; bytes: Uint8Array }>

type AcceptedInput = { name: string; accept: ImageAccept }

export function acceptedInputsOf(app: AppDefinition): AcceptedInput[] {
  return app.inputs.flatMap((input) =>
    input.type === "image" && input.accept !== undefined
      ? [{ name: input.name, accept: input.accept }]
      : []
  )
}

function problemOf(
  name: string,
  accept: ImageAccept,
  file: { mime: string; bytes: Uint8Array }
): string | null {
  if (!(accept.formats as readonly string[]).includes(file.mime)) {
    return `${name}: the file is ${file.mime}, and this input takes ${accept.formats.join(", ")}`
  }
  if (file.bytes.length > accept.maxBytes) {
    return `${name}: the file holds ${file.bytes.length} bytes, above ${accept.maxBytes}`
  }
  const size = imageSizeOf(file.bytes)
  if (size === null) {
    return `${name}: the file declares no width and height`
  }
  const short = Math.min(size.width, size.height)
  return short < accept.minShortSide
    ? `${name}: the image is ${short} pixels on its short side, below ${accept.minShortSide}`
    : null
}

/** Lists what each image input's files break of the formats, the bytes and the short side the input accepts. */
export async function imageProblemsOf(
  app: AppDefinition,
  inputs: RunInputs,
  read: ReadImage
): Promise<string[]> {
  const problems: string[] = []
  for (const { name, accept } of acceptedInputsOf(app)) {
    const value = inputs[name]
    for (const assetId of Array.isArray(value) ? value : []) {
      const problem = problemOf(name, accept, await read(assetId))
      if (problem !== null) {
        problems.push(problem)
      }
    }
  }
  return problems
}
