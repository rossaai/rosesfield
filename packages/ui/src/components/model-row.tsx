import { Badge, type BadgeKind } from "@rosesfield/ui/components/badge"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { interaction } from "@rosesfield/ui/components/interaction"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { CheckIcon } from "lucide-react"
import { memo, type ReactElement, type ReactNode } from "react"

type ModelPickerTag = {
  label: string
  icon?: ReactNode
  display?: "words" | "glyph"
}

type ModelBadge = {
  kind: BadgeKind
  label: string
  href?: string
  markColour?: string
}

type ModelRank = {
  place: number
  label: string
  note?: string
}

type ModelPrice = {
  amount: string
  name: string
  credits: number
  note?: string
}

type ModelPickerRow = {
  id: string
  name: string
  keywords: readonly string[]
  mark?: ReactNode
  rank?: ModelRank
  badges: readonly ModelBadge[]
  capabilities: readonly ModelPickerTag[]
  price?: ModelPrice
}

type RankTone = "gold" | "silver" | "bronze" | "quiet"

const rankTones = {
  gold: "bg-cem-tint text-cem-text ring-1 ring-cem ring-inset",
  silver: "bg-(--tint) text-ink ring-1 ring-ink-muted ring-inset",
  bronze: "bg-cem-tint text-cem-text",
  quiet: "bg-(--tint) text-ink-muted",
} satisfies Record<RankTone, string>

function rankToneOf(place: number): RankTone {
  switch (place) {
    case 1:
      return "gold"
    case 2:
      return "silver"
    case 3:
      return "bronze"
    default:
      return "quiet"
  }
}

function RankBadge({ rank }: { rank: ModelRank }): ReactElement {
  const tone = rankToneOf(rank.place)
  const badge = (
    <span
      role="img"
      data-slot="model-row-rank"
      data-tone={tone}
      aria-label={rank.label}
      tabIndex={rank.note === undefined ? undefined : 0}
      className={cn(
        "pointer-events-auto absolute -end-1.5 -top-1.5 z-10 flex rounded-full bg-(--ground) outline-none",
        interaction.ring
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-medium text-legal leading-none tabular-nums",
          rankTones[tone]
        )}
      >
        {rank.place}
      </span>
    </span>
  )
  if (rank.note === undefined) {
    return badge
  }
  return (
    <Tooltip>
      <TooltipTrigger render={badge} />
      <TooltipContent className="pointer-events-none h-auto py-s1 whitespace-normal">
        {rank.note}
      </TooltipContent>
    </Tooltip>
  )
}

function RowMark({ row }: { row: ModelPickerRow }): ReactElement {
  return (
    <span className="relative flex shrink-0">
      <span
        data-slot="model-row-mark"
        aria-hidden="true"
        className="flex size-icon-dense shrink-0 items-center justify-center rounded-dense bg-(--well) text-ink-muted group-data-[chosen=yes]/row:text-ink [&_svg]:glyph-small"
      >
        {row.mark}
      </span>
      {row.rank === undefined ? null : <RankBadge rank={row.rank} />}
    </span>
  )
}

function RowBadge({ badge }: { badge: ModelBadge }): ReactElement {
  return (
    <Badge
      kind={badge.kind}
      {...(badge.href === undefined ? {} : { href: badge.href })}
      {...(badge.markColour === undefined
        ? {}
        : { markColour: badge.markColour })}
    >
      {badge.label}
    </Badge>
  )
}

function RowName({ row }: { row: ModelPickerRow }): ReactElement {
  const facts = row.badges.filter((badge) => badge.kind !== "openWeights")
  const weights = row.badges.filter((badge) => badge.kind === "openWeights")
  return (
    <span className="flex min-w-0 items-center">
      <span data-slot="model-row-name" className="truncate text-body text-ink">
        {row.name}
      </span>
      {facts.length === 0 ? null : (
        <span data-slot="model-row-badges" className="flex shrink-0">
          {facts.map((badge) => (
            <RowBadge key={badge.kind} badge={badge} />
          ))}
        </span>
      )}
      {weights.length === 0 ? null : (
        <span data-slot="model-row-weights" className="flex shrink-0">
          {weights.map((badge) => (
            <RowBadge key={badge.kind} badge={badge} />
          ))}
        </span>
      )}
    </span>
  )
}

const capabilityLimit = 6

function RowCapabilities({ row }: { row: ModelPickerRow }): ReactNode {
  const shown = row.capabilities.slice(0, capabilityLimit)
  if (shown.length === 0) {
    return null
  }
  return (
    <span
      data-slot="model-row-capabilities"
      className="flex h-(--text-caption--line-height) min-w-0 flex-wrap items-center gap-x-s2 overflow-hidden text-caption whitespace-nowrap text-ink-muted"
    >
      {shown.map((capability) =>
        capability.display === "glyph" ? (
          <span
            key={capability.label}
            role="img"
            aria-label={capability.label}
            data-slot="model-row-capability"
            data-display="glyph"
            className="inline-flex h-(--text-caption--line-height) shrink-0 items-center [&_svg]:glyph-small"
          >
            {capability.icon}
          </span>
        ) : (
          <span
            key={capability.label}
            data-slot="model-row-capability"
            className="inline-flex h-(--text-caption--line-height) shrink-0 items-center gap-s1 [&_svg]:glyph-small"
          >
            {capability.icon}
            {capability.label}
          </span>
        )
      )}
    </span>
  )
}

function PriceNote({
  price,
  note,
}: {
  price: ModelPrice
  note: string
}): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            role="img"
            data-slot="model-row-price-note"
            aria-label={`${price.name}. ${note}`}
            className="pointer-events-auto"
          >
            <CreditPrice amount={price.amount} />
          </span>
        }
      />
      <TooltipContent className="pointer-events-none flex h-auto flex-col items-start gap-0 py-s1 whitespace-normal">
        <span data-slot="model-row-price-name" className="whitespace-nowrap">
          {price.name}
        </span>
        <span>{note}</span>
      </TooltipContent>
    </Tooltip>
  )
}

function RowPrice({
  price,
  isPricing,
}: {
  price: ModelPrice | undefined
  isPricing: boolean
}): ReactElement {
  return (
    <span
      data-slot="model-row-price"
      title={price?.note === undefined ? price?.name : undefined}
      data-state={
        price !== undefined ? "known" : isPricing ? "pending" : "none"
      }
      className="ms-s2 flex w-[calc(2*var(--spacing-s8))] shrink-0 items-center justify-end text-caption text-ink-muted data-[state=none]:ms-0 data-[state=none]:w-0"
    >
      {price === undefined ? (
        isPricing ? (
          <Skeleton
            data-slot="model-row-price-loading"
            shape="line"
            text="caption"
            measure="full"
          />
        ) : null
      ) : price.note === undefined ? (
        <CreditPrice amount={price.amount} />
      ) : (
        <PriceNote price={price} note={price.note} />
      )}
    </span>
  )
}

type ModelRowProps = {
  row: ModelPickerRow
  isChosen: boolean
  isPricing: boolean
  onChoose: (id: string) => void
}

function ModelRowView({
  row,
  isChosen,
  isPricing,
  onChoose,
}: ModelRowProps): ReactElement {
  return (
    <div
      role="none"
      data-slot="model-row"
      data-chosen={isChosen ? "yes" : "no"}
      data-ground={isChosen ? "surface" : undefined}
      className="group/row relative mx-s3 h-13 rounded-cell data-[chosen=yes]:bg-surface"
    >
      <button
        type="button"
        role="option"
        aria-selected={isChosen}
        aria-label={
          row.price === undefined ? row.name : `${row.name}, ${row.price.name}`
        }
        data-model={row.id}
        className={cn(
          "absolute inset-0 rounded-cell outline-none group-data-[chosen=no]/row:hover:bg-(--tint)",
          motion.tint,
          interaction.ring
        )}
        onClick={() => onChoose(row.id)}
      />
      <span
        role="none"
        onClick={(event) => {
          if (!(event.target instanceof Element && event.target.closest("a"))) {
            onChoose(row.id)
          }
        }}
        className="pointer-events-none relative flex h-full items-center ps-s2 pe-s3"
      >
        <RowMark row={row} />
        <span className="ms-s2 flex min-w-0 flex-1 flex-col">
          <RowName row={row} />
          <RowCapabilities row={row} />
        </span>
        <RowPrice price={row.price} isPricing={isPricing} />
        <span
          data-slot="model-row-check"
          className="ms-s2 flex size-glyph shrink-0 text-ink-muted"
        >
          {isChosen ? <CheckIcon aria-hidden="true" className="glyph" /> : null}
        </span>
      </span>
    </div>
  )
}

const ModelRow = memo(ModelRowView)

function ModelRowSkeleton(): ReactElement {
  return (
    <div
      data-slot="model-row"
      data-state="loading"
      className="flex h-13 items-center gap-s2 rounded-cell ps-s2 pe-s3"
    >
      <Skeleton shape="block" className="size-icon-dense rounded-dense" />
      <span className="flex min-w-0 flex-1 flex-col">
        <Skeleton shape="line" text="body" measure="mid" />
        <Skeleton shape="line" text="caption" measure="short" />
      </span>
    </div>
  )
}

export type {
  ModelBadge,
  ModelPickerRow,
  ModelPickerTag,
  ModelPrice,
  ModelRank,
  ModelRowProps,
  RankTone,
}
export { ModelRow, ModelRowSkeleton, rankToneOf }
