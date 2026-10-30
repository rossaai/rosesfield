import {
  type SheetTemplate,
  templateInputsOf,
  templateNameKeyOf,
  templates,
} from "@rosesfield/catalog/ai-influencer"
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
import { runModel } from "@/pieces/run/run-facts"
import type { Draft } from "@/router-context"
import { mediaOf, type ShowcaseItem, showcaseItems } from "@/showcase/showcase"

export type AppExample = {
  id: string
  name: string
  line: string | null
  src: string
  kind: "image" | "video"
  aspect: MediaAspect
  draft: Draft
}

const motionAppId = "motion"

const aiInfluencerAppId = "ai-influencer"

const examplesByApp: Readonly<Record<string, readonly LibraryExample[]>> = {
  [motionAppId]: approvedExamples,
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
  offered: readonly string[] = offeredResolutions(motionAppId)
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
        line: tCatalog(`motion.example.${key}.photo`),
        src,
        kind: "video",
        aspect: { width: preview.width, height: preview.height },
        draft: draftOf(example),
      },
    ]
  })
}

function templateDraftOf(template: SheetTemplate): Draft {
  return {
    prompt: "",
    assetIds: [],
    characterIds: [],
    inputs: templateInputsOf(template),
  }
}

/** AI Influencer's templates as Library tiles: each shows the run its preview was made in, and names the model that made it. */
export function templateExamplesOf(
  list: readonly SheetTemplate[],
  items: readonly ShowcaseItem[] = showcaseItems
): AppExample[] {
  const app = findCatalogApp(aiInfluencerAppId)
  return list.flatMap((template) => {
    const item = items.find((one) => one.runId === template.preview.runId)
    if (item === undefined) {
      return []
    }
    const model = runModel(item.run, app)
    return [
      {
        id: template.id,
        name: tCatalog(templateNameKeyOf(template.id)),
        line:
          model === null
            ? null
            : tCatalog("aiInfluencer.template.madeWith", { model }),
        src: item.src,
        kind: "image",
        aspect: { width: item.width, height: item.height },
        draft: templateDraftOf(template),
      },
    ]
  })
}

export function examplesOf(appId: string): AppExample[] {
  return appId === aiInfluencerAppId
    ? templateExamplesOf(templates)
    : appExamplesOf(examplesByApp[appId] ?? [])
}

/** The draft the form of an app fills on open from the example its address names. AI Influencer fills its template in its own screen, once its model has opened, so this gives none for it. */
export function exampleDraftOf(
  appId: string,
  id: string | undefined
): Draft | null {
  const example = (examplesByApp[appId] ?? []).find((one) => one.id === id)
  return example === undefined
    ? null
    : draftOf(example, offeredResolutions(appId))
}
