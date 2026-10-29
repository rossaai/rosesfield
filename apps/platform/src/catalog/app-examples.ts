import {
  approvedExamples,
  exampleInput,
  exampleKeyOf,
  type LibraryExample,
  ltx25GuideModel,
} from "@rosesfield/catalog/motion"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { findCatalogApp } from "@/catalog/catalog-apps"
import { tCatalog } from "@/copy/t"
import type { Draft } from "@/router-context"
import { mediaOf } from "@/showcase/showcase"

export type AppExample = {
  id: string
  name: string
  need: string
  src: string
  aspect: MediaAspect
  draft: Draft
}

const examplesByApp: Readonly<Record<string, readonly LibraryExample[]>> = {
  motion: approvedExamples,
}

const resolutionInput = "resolution"

function offeredResolutions(appId: string): readonly string[] {
  const input = findCatalogApp(appId)?.inputs.find(
    (one) => one.name === resolutionInput
  )
  return input?.type === "choice"
    ? input.options.map((option) => option.value)
    : []
}

export function draftOf(
  example: LibraryExample,
  offered: readonly string[] = offeredResolutions("motion")
): Draft {
  const shown = example.preview?.resolution
  const resolution =
    shown !== undefined && offered.includes(shown) ? shown : undefined
  return {
    prompt: "",
    assetIds: [],
    characterIds: [],
    inputs: {
      [exampleInput]: example.id,
      ...(example.guide === null ? {} : { model: ltx25GuideModel }),
      ...(resolution === undefined ? {} : { resolution }),
    },
  }
}

export function appExamplesOf(
  examples: readonly LibraryExample[],
  media: (file: string) => string | null = mediaOf
): AppExample[] {
  return examples.flatMap((example) => {
    const { preview } = example
    const src = preview === null ? null : media(preview.file)
    if (preview === null || src === null) {
      return []
    }
    const key = exampleKeyOf(example.id)
    return [
      {
        id: example.id,
        name: tCatalog(`motion.example.${key}.name`),
        need: tCatalog(`motion.example.${key}.photo`),
        src,
        aspect: { width: preview.width, height: preview.height },
        draft: draftOf(example),
      },
    ]
  })
}

export function examplesOf(appId: string): AppExample[] {
  return appExamplesOf(examplesByApp[appId] ?? [])
}

export function exampleDraftOf(
  appId: string,
  id: string | undefined
): Draft | null {
  const example = (examplesByApp[appId] ?? []).find((one) => one.id === id)
  return example === undefined
    ? null
    : draftOf(example, offeredResolutions(appId))
}
