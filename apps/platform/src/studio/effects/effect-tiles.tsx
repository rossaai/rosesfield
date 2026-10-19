import {
  type EffectRecipe,
  effectKeyOf,
  effectRecipes,
} from "@rosesfield/catalog/effects"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { PreviewSlot } from "@rosesfield/ui/components/preview-slot"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ImagePlusIcon } from "lucide-react"
import { type ReactElement, useEffect, useRef } from "react"
import { formatNumber } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { previewOf } from "@/studio/effects/effect-previews"

export type EffectTile = {
  effect: string
  label: string
  photo: string
  credits: number | null
  preview: string | null
}

export type EffectGroups = {
  shown: EffectTile[]
  inReview: EffectTile[]
}

type EffectTilesProps = {
  app: AppListing
  value: string
  resolution: string
  onChange: (effect: string) => void
  register: (focus: () => void) => void
  recipes?: readonly EffectRecipe[]
  previews?: (file: string) => string | null
}

const tileAspect = { width: 3, height: 4 }

function optionsOf(app: AppListing): string[] {
  const input = app.inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === "effect" && one.type === "choice"
  )
  return input === undefined ? [] : input.options.map((option) => option.value)
}

function creditsAt(recipe: EffectRecipe, resolution: string): number | null {
  return resolution === "480p" || resolution === "720p"
    ? (recipe.credits[resolution]?.credits ?? null)
    : null
}

export function effectGroups(
  app: AppListing,
  resolution: string,
  recipes: readonly EffectRecipe[] = effectRecipes,
  previews: (file: string) => string | null = previewOf
): EffectGroups {
  const groups: EffectGroups = { shown: [], inReview: [] }
  for (const effect of optionsOf(app)) {
    const recipe = recipes.find((one) => one.effect === effect)
    if (recipe === undefined) {
      continue
    }
    const key = effectKeyOf(effect)
    const preview =
      recipe.preview === null ? null : previews(recipe.preview.file)
    const tile: EffectTile = {
      effect,
      label: tCatalog(`effects.choice.effect.${key}`),
      photo: tCatalog(`effects.photo.${key}`),
      credits: creditsAt(recipe, resolution),
      preview,
    }
    if (recipe.review === "passed") {
      if (preview !== null) {
        groups.shown.push(tile)
      }
    } else {
      groups.inReview.push(tile)
    }
  }
  return groups
}

function TileMedia({ tile }: { tile: EffectTile }): ReactElement {
  return tile.preview === null ? (
    <PreviewSlot aspect={tileAspect} label={t("previewSlot.label")} />
  ) : (
    <MediaTile
      kind="video"
      src={tile.preview}
      alt={tile.label}
      aspect={tileAspect}
    />
  )
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
        "flex w-full min-w-0 flex-col gap-s1_5 rounded-card p-s1_5 text-left",
        isChosen ? "bg-selection" : "hover:bg-(--tint)",
        motion.tint
      )}
    >
      <TileMedia tile={tile} />
      <span className="px-s1 text-body">{tile.label}</span>
      <span className="flex items-start gap-s1 px-s1 text-caption text-ink-muted">
        <ImagePlusIcon aria-hidden="true" className="glyph-small shrink-0" />
        <span>{tile.photo}</span>
      </span>
      <span className="px-s1 text-caption text-ink-muted">
        {tile.credits === null ? (
          t("run.price.unknown")
        ) : (
          <CreditPrice amount={formatNumber(tile.credits)} />
        )}
      </span>
    </button>
  )
}

function TileGrid(props: {
  label: string
  tiles: readonly EffectTile[]
  value: string
  onChange: (effect: string) => void
  chosenRef: (element: HTMLButtonElement | null) => void
}): ReactElement {
  return (
    <ul aria-label={props.label} className="grid grid-cols-2 gap-s2">
      {props.tiles.map((tile) => (
        <li key={tile.effect} className="flex min-w-0">
          <Tile
            tile={tile}
            isChosen={tile.effect === props.value}
            onChoose={() => props.onChange(tile.effect)}
            chosenRef={props.chosenRef}
          />
        </li>
      ))}
    </ul>
  )
}

export function EffectTiles(props: EffectTilesProps): ReactElement {
  const chosen = useRef<HTMLButtonElement | null>(null)
  const { register } = props
  useEffect(() => {
    register(() => chosen.current?.focus())
  }, [register])
  const groups = effectGroups(
    props.app,
    props.resolution,
    props.recipes,
    props.previews
  )
  const setChosen = (element: HTMLButtonElement | null): void => {
    chosen.current = element
  }
  const label = tCatalog("effects.input.effect.label")
  return (
    <section className="flex flex-col gap-s3">
      <h2 className="text-label text-ink-muted">{label}</h2>
      {groups.shown.length === 0 ? null : (
        <TileGrid
          label={label}
          tiles={groups.shown}
          value={props.value}
          onChange={props.onChange}
          chosenRef={setChosen}
        />
      )}
      {groups.inReview.length === 0 ? null : (
        <div className="flex flex-col gap-s2">
          <h3 className="text-body font-medium">
            {tCatalog("effects.inReview.title")}
          </h3>
          <p className="text-caption text-ink-muted">
            {tCatalog("effects.inReview.note")}
          </p>
          <TileGrid
            label={tCatalog("effects.inReview.title")}
            tiles={groups.inReview}
            value={props.value}
            onChange={props.onChange}
            chosenRef={setChosen}
          />
        </div>
      )}
    </section>
  )
}
