import {
  type EffectRecipe,
  type EffectRun,
  effectKeyOf,
  effectRecipes,
  effectRuns,
} from "@rosesfield/catalog/effects"
import type { AppListing, InputDefinition } from "@rosesfield/contract"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { interaction } from "@rosesfield/ui/components/interaction"
import { MediaBadge } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { type ReactElement, type ReactNode, useEffect, useRef } from "react"
import { formatWholeCredits } from "@/copy/format"
import { t, tCatalog } from "@/copy/t"
import { ChosenVeil } from "@/pieces/selectable-tile"
import { previewOf } from "@/studio/effects/effect-previews"
import type { EffectPrices } from "@/studio/effects/use-effect-prices"

export type KeptRunPrice = {
  credits: number
  resolution: string
}

export type EffectTile = {
  effect: string
  label: string
  photo: string
  preview: string
  kept: KeptRunPrice | null
}

export type TilePrice = {
  amount: string
  words: string
}

type EffectTilesProps = {
  app: AppListing
  value: string
  prices: EffectPrices
  onChange: (effect: string) => void
  register: (focus: () => void) => void
  recipes?: readonly EffectRecipe[]
  previews?: (file: string) => string | null
  runs?: readonly EffectRun[]
}

export function effectOptionsOf(app: AppListing): string[] {
  const input = app.inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === "effect" && one.type === "choice"
  )
  return input === undefined ? [] : input.options.map((option) => option.value)
}

export function keptPriceOf(
  recipe: EffectRecipe,
  runs: readonly EffectRun[]
): KeptRunPrice | null {
  const preview = recipe.preview
  const run =
    preview === null
      ? undefined
      : runs.find(
          (one) => one.runId === preview.runId && one.verdict === "kept"
        )
  if (run === undefined) {
    return null
  }
  const credits =
    Math.round((run.balance.before - run.balance.after) * 100) / 100
  return credits > 0 ? { credits, resolution: run.resolution } : null
}

export function tilePriceOf(
  tile: EffectTile,
  prices: EffectPrices
): TilePrice | null {
  const credits = prices.creditsOf(tile.effect)
  if (credits !== null && prices.isMeasured(tile.effect)) {
    const amount = formatWholeCredits(credits)
    return { amount, words: t("run.price.credits", { amount }) }
  }
  if (tile.kept !== null) {
    const amount = formatWholeCredits(tile.kept.credits)
    return {
      amount,
      words: t("run.price.kept", {
        amount,
        resolution: tile.kept.resolution,
      }),
    }
  }
  if (credits === null) {
    return null
  }
  const amount = formatWholeCredits(credits)
  return { amount, words: t("run.price.credits", { amount }) }
}

export function effectTiles(
  app: AppListing,
  recipes: readonly EffectRecipe[] = effectRecipes,
  previews: (file: string) => string | null = previewOf,
  runs: readonly EffectRun[] = effectRuns
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
        kept: keptPriceOf(recipe, runs),
      },
    ]
  })
}

function PriceBadge({ price }: { price: TilePrice | null }): ReactNode {
  return price === null ? null : (
    <span
      data-slot="effect-price"
      title={price.words}
      className="absolute start-s1_5 bottom-s1_5 flex max-w-[calc(100%-2*var(--spacing-s1_5))]"
    >
      <MediaBadge>
        <CreditPrice amount={price.amount} />
        <span className="sr-only">{price.words}</span>
      </MediaBadge>
    </span>
  )
}

function Tile({
  tile,
  price,
  isChosen,
  onChoose,
  chosenRef,
}: {
  tile: EffectTile
  price: TilePrice | null
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
        className="relative aspect-3/4 w-full overflow-hidden rounded-cell bg-(--well)"
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
        <PriceBadge price={price} />
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
  const tiles = effectTiles(
    props.app,
    props.recipes,
    props.previews,
    props.runs
  )
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
              price={tilePriceOf(tile, props.prices)}
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
