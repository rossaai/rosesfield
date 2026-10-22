import {
  type EffectRecipe,
  effectsApp,
  recipeOf,
} from "@rosesfield/catalog/effects"
import {
  type AppListing,
  appDefinition,
  appListing,
} from "@rosesfield/contract"
import { type ReactElement, useState } from "react"
import demoVideo from "@/gallery/fixtures/demo-video-16-9.mp4"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { EffectTiles } from "@/studio/effects/effect-tiles"

const runId = "5b1d2c3e-4f5a-4b6c-8d7e-9f0a1b2c3d4e"

function passed(effect: string): EffectRecipe {
  return {
    ...recipeOf(effect),
    passed: true,
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

const shown: readonly EffectRecipe[] = [
  passed("pull-back-to-space"),
  passed("many-copies"),
  passed("grow-giant"),
]

const openApp: AppListing = appListing.parse(
  appDefinition.parse(effectsApp(shown))
)

function Tiles({ width }: { width: number }): ReactElement {
  const [value, setValue] = useState(shown[0]?.effect ?? "")
  return (
    <div style={{ width }} className="max-w-full bg-canvas p-s4">
      <EffectTiles
        app={openApp}
        value={value}
        onChange={setValue}
        register={() => undefined}
        recipes={shown}
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
      render: () => <Tiles width={394} />,
    },
    {
      id: "phone",
      label: "state.effectsPhone",
      width: "full",
      render: () => <Tiles width={358} />,
    },
  ],
}
