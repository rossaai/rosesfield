import {
  type EffectRecipe,
  effectRecipes,
  recipeOf,
} from "@rosesfield/catalog/effects"
import { type ReactElement, useState } from "react"
import { findCatalogApp } from "@/catalog/catalog-apps"
import demoVideo from "@/gallery/fixtures/demo-video-16-9.mp4"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { EffectTiles } from "@/studio/effects/effect-tiles"

const runId = "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e"

function passed(effect: string): EffectRecipe {
  return {
    ...recipeOf(effect),
    review: "passed",
    credits: { "480p": { credits: 6.52, runId }, "720p": null },
    preview: {
      file: `${effect}.mp4`,
      runId,
      seed: 7,
      resolution: "480p",
      aspectRatio: "9:16",
      workflowHash:
        "ed50011518009bb7519b8d93286267699aeb1c3863c4fe89c4ade3470cf8673f",
    },
  }
}

const someShown: readonly EffectRecipe[] = [
  passed("pull-back-to-space"),
  passed("liquid-metal"),
  passed("grow-wings"),
  recipeOf("buildings-ripple"),
]

function Tiles({
  recipes,
  width,
}: {
  recipes: readonly EffectRecipe[]
  width: number
}): ReactElement | null {
  const app = findCatalogApp("effects")
  const [value, setValue] = useState(recipes[0]?.effect ?? "")
  if (app === null) {
    return null
  }
  return (
    <div style={{ width }} className="bg-canvas p-s4">
      <EffectTiles
        app={app}
        value={value}
        resolution="480p"
        onChange={setValue}
        register={() => undefined}
        recipes={recipes}
        previews={() => demoVideo}
      />
    </div>
  )
}

export const effectTilesEntry: GalleryEntry = {
  id: "effect-tiles",
  title: "entry.effectTiles",
  states: [
    {
      id: "passed",
      label: "state.effectsPassed",
      width: "full",
      render: () => <Tiles recipes={someShown} width={394} />,
    },
    {
      id: "in-review",
      label: "state.effectsInReview",
      width: "full",
      render: () => <Tiles recipes={effectRecipes} width={394} />,
    },
    {
      id: "phone",
      label: "state.effectsPhone",
      width: "full",
      render: () => <Tiles recipes={someShown} width={358} />,
    },
  ],
}
