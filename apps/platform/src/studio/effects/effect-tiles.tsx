import {
  type EffectRecipe,
  type EffectRun,
  effectKeyOf,
  effectRecipes,
  effectRuns,
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

export type KeptRunPrice = {
  credits: number
  resolution: string
}

export type EffectTile = {
  effect: string
  label: string
  photo: string
  look: { status: "passed"; preview: string } | { status: "draft" }
  kept: KeptRunPrice | null
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

const tileAspect = { width: 3, height: 4 }
const draftKey = "effects.draft"

export function effectOptionsOf(app: AppListing): string[] {
  const input = app.inputs.find(
    (one): one is Extract<InputDefinition, { type: "choice" }> =>
      one.name === "effect" && one.type === "choice"
  )
  return input === undefined ? [] : input.options.map((option) => option.value)
}

function keptPriceOf(
  recipe: EffectRecipe,
  runs: readonly EffectRun[]
): KeptRunPrice | null {
  const preview = recipe.preview
  const run =
    preview === null
      ? undefined
      : runs.find((one) => one.runId === preview.runId)
  if (run === undefined) {
    return null
  }
  const credits =
    Math.round((run.balance.before - run.balance.after) * 100) / 100
  return credits > 0 ? { credits, resolution: run.resolution } : null
}

export function effectTiles(
  app: AppListing,
  recipes: readonly EffectRecipe[] = effectRecipes,
  previews: (file: string) => string | null = previewOf,
  runs: readonly EffectRun[] = effectRuns
): EffectTile[] {
  return effectOptionsOf(app).flatMap((effect) => {
    const recipe = recipes.find((one) => one.effect === effect)
    if (recipe === undefined) {
      return []
    }
    const look = lookOf(recipe, previews)
    if (look === null) {
      return []
    }
    const key = effectKeyOf(effect)
    return [
      {
        effect,
        label: tCatalog(`effects.choice.effect.${key}`),
        photo: tCatalog(`effects.photo.${key}`),
        look,
        kept: recipe.passed ? keptPriceOf(recipe, runs) : null,
      },
    ]
  })
}

function lookOf(
  recipe: EffectRecipe,
  previews: (file: string) => string | null
): EffectTile["look"] | null {
  if (!recipe.passed) {
    return { status: "draft" }
  }
  const preview = recipe.preview === null ? null : previews(recipe.preview.file)
  return preview === null ? null : { status: "passed", preview }
}

function TileLook({ tile }: { tile: EffectTile }): ReactElement {
  if (tile.look.status === "passed") {
    return (
      <MediaTile
        kind="video"
        src={tile.look.preview}
        alt={tile.label}
        aspect={tileAspect}
      />
    )
  }
  return (
    <span
      data-slot="effect-draft"
      className="flex w-full items-center justify-center rounded-cell bg-(--well) text-caption text-ink-muted"
      style={{ aspectRatio: `${tileAspect.width} / ${tileAspect.height}` }}
    >
      {tCatalog(draftKey)}
    </span>
  )
}

function priceTextOf(tile: EffectTile, prices: EffectPrices): string | null {
  const credits = prices.creditsOf(tile.effect)
  if (credits !== null && prices.isMeasured(tile.effect)) {
    return t("run.price.credits", { amount: formatNumber(credits) })
  }
  if (tile.kept !== null) {
    return t("run.price.kept", {
      amount: formatNumber(tile.kept.credits),
      resolution: tile.kept.resolution,
    })
  }
  return credits === null
    ? null
    : t("run.price.credits", { amount: formatNumber(credits) })
}

function PriceLine({
  tile,
  prices,
}: {
  tile: EffectTile
  prices: EffectPrices
}): ReactNode {
  if (prices.isDemo) {
    return (
      <span className="px-s1 text-caption text-ink-muted">
        {t("run.price.demo")}
      </span>
    )
  }
  const text = priceTextOf(tile, prices)
  return text === null ? null : (
    <span className="px-s1 text-caption text-ink-muted">
      <CreditPrice amount={text} />
    </span>
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
      data-look={tile.look.status}
      className={cn(
        "flex w-full min-w-0 flex-col gap-s1_5 rounded-card p-s1_5 text-left",
        isChosen ? "bg-selection" : "hover:bg-(--tint)",
        motion.tint
      )}
    >
      <TileLook tile={tile} />
      <span className="px-s1 text-body">{tile.label}</span>
      <span className="flex items-start gap-s1 px-s1 text-caption text-ink-muted">
        <ImagePlusIcon aria-hidden="true" className="glyph-small shrink-0" />
        <span>{tile.photo}</span>
      </span>
      <PriceLine tile={tile} prices={prices} />
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
