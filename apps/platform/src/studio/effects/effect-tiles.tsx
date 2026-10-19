import {
  type EffectRecipe,
  effectKeyOf,
  effectRecipes,
} from "@rosesfield/catalog/effects"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ImagePlusIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useEffect, useRef } from "react"
import { formatNumber } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { previewOf } from "@/studio/effects/effect-previews"
import type { EffectPrices } from "@/studio/effects/use-effect-prices"

export type EffectTile = {
  effect: string
  label: string
  photo: string
  preview: string
}

type EffectTilesProps = {
  app: AppListing
  value: string
  prices: EffectPrices
  onChange: (effect: string) => void
  register: (focus: () => void) => void
  recipes?: readonly EffectRecipe[]
  previews?: (file: string) => string | null
}

const tileAspect = { width: 3, height: 4 }

export function effectOptionsOf(app: AppListing): string[] {
  const input = app.inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === "effect" && one.type === "choice"
  )
  return input === undefined ? [] : input.options.map((option) => option.value)
}

export function effectTiles(
  app: AppListing,
  recipes: readonly EffectRecipe[] = effectRecipes,
  previews: (file: string) => string | null = previewOf
): EffectTile[] {
  return effectOptionsOf(app).flatMap((effect) => {
    const recipe = recipes.find((one) => one.effect === effect)
    const preview =
      recipe?.passed === true && recipe.preview !== null
        ? previews(recipe.preview.file)
        : null
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
      },
    ]
  })
}

function PriceLine({
  effect,
  prices,
}: {
  effect: string
  prices: EffectPrices
}): ReactNode {
  if (prices.isDemo) {
    return t("run.price.demo")
  }
  const credits = prices.creditsOf(effect)
  return credits === null ? (
    t("run.price.unknown")
  ) : (
    <CreditPrice amount={formatNumber(credits)} />
  )
}

function Tile({
  tile,
  prices,
  isChosen,
  onChoose,
  chosenRef,
}: {
  tile: EffectTile
  prices: EffectPrices
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
      <MediaTile
        kind="video"
        src={tile.preview}
        alt={tile.label}
        aspect={tileAspect}
      />
      <span className="px-s1 text-body">{tile.label}</span>
      <span className="flex items-start gap-s1 px-s1 text-caption text-ink-muted">
        <ImagePlusIcon aria-hidden="true" className="glyph-small shrink-0" />
        <span>{tile.photo}</span>
      </span>
      <span className="px-s1 text-caption text-ink-muted">
        <PriceLine effect={tile.effect} prices={prices} />
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
      <h2 className="text-label text-ink-muted">{label}</h2>
      <ul aria-label={label} className="grid grid-cols-2 gap-s2">
        {tiles.map((tile) => (
          <li key={tile.effect} className="flex min-w-0">
            <Tile
              tile={tile}
              prices={props.prices}
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
