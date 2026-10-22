import {
  type EffectRecipe,
  effectKeyOf,
  effectRecipes,
} from "@rosesfield/catalog/effects"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { type ReactElement, useEffect, useRef } from "react"
import { tCatalog } from "@/copy/t"
import { ChosenVeil } from "@/pieces/selectable-tile"
import { previewOf } from "@/studio/effects/effect-previews"

export type EffectTile = {
  effect: string
  label: string
  photo: string
  preview: string
  aspect: MediaAspect
}

type EffectTilesProps = {
  app: AppListing
  value: string
  onChange: (effect: string) => void
  register: (focus: () => void) => void
  recipes?: readonly EffectRecipe[]
  previews?: (file: string) => string | null
}

const fallbackAspect: MediaAspect = { width: 9, height: 16 }

export function effectOptionsOf(app: AppListing): string[] {
  const input = app.inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === "effect" && one.type === "choice"
  )
  return input === undefined ? [] : input.options.map((option) => option.value)
}

function aspectOfRatio(ratio: string | undefined): MediaAspect {
  const [width, height] = (ratio ?? "").split(":").map(Number)
  return width !== undefined && height !== undefined && width > 0 && height > 0
    ? { width, height }
    : fallbackAspect
}

export function effectTiles(
  app: AppListing,
  recipes: readonly EffectRecipe[] = effectRecipes,
  previews: (file: string) => string | null = previewOf
): EffectTile[] {
  return effectOptionsOf(app).flatMap((effect) => {
    const recipe = recipes.find((one) => one.effect === effect)
    if (recipe === undefined || !recipe.passed || recipe.preview === null) {
      return []
    }
    const preview = previews(recipe.preview.file)
    if (preview === null) {
      return []
    }
    const key = effectKeyOf(effect)
    return [
      {
        effect,
        label: tCatalog(`effects.choice.effect.${key}`),
        photo: tCatalog(`effects.photo.${key}`),
        preview,
        aspect: aspectOfRatio(recipe.preview.aspectRatio),
      },
    ]
  })
}

function Tile({
  tile,
  isChosen,
  onChoose,
  chosenRef,
}: {
  tile: EffectTile
  isChosen: boolean
  onChoose: () => void
  chosenRef: (element: HTMLButtonElement | null) => void
}): ReactElement {
  return (
    <button
      type="button"
      aria-pressed={isChosen}
      ref={isChosen ? chosenRef : undefined}
      onClick={onChoose}
      data-effect={tile.effect}
      className={cn(
        "group/tile flex w-full min-w-0 flex-col gap-s2 rounded-card text-left",
        interaction.ring
      )}
    >
      <span
        data-slot="effect-clip"
        className="relative w-full overflow-hidden rounded-cell bg-(--well)"
        style={{ aspectRatio: `${tile.aspect.width} / ${tile.aspect.height}` }}
      >
        <video
          src={tile.preview}
          aria-label={tile.label}
          muted
          loop
          autoPlay
          playsInline
          preload="auto"
          className="absolute inset-0 size-full object-cover"
        />
        <ChosenVeil isChosen={isChosen} />
      </span>
      <span
        className={cn(
          "truncate px-s1 text-body",
          isChosen ? "font-medium text-ink" : "text-ink-muted"
        )}
      >
        {tile.label}
      </span>
    </button>
  )
}

export function EffectTiles(props: EffectTilesProps): ReactElement {
  const chosen = useRef<HTMLButtonElement | null>(null)
  const { register } = props
  useEffect(() => {
    register(() => chosen.current?.focus())
  }, [register])
  const tiles = effectTiles(props.app, props.recipes, props.previews)
  const setChosen = (element: HTMLButtonElement | null): void => {
    chosen.current = element
  }
  const label = tCatalog("effects.input.effect.label")
  return (
    <section className="flex flex-col gap-s3">
      <h2 className="text-body text-ink">{label}</h2>
      <ul aria-label={label} className="grid grid-cols-2 items-start gap-s3">
        {tiles.map((tile) => (
          <li key={tile.effect} className="flex min-w-0">
            <Tile
              tile={tile}
              isChosen={tile.effect === props.value}
              onChoose={() => props.onChange(tile.effect)}
              chosenRef={setChosen}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
