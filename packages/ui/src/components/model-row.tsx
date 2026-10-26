import { Badge, type BadgeKind } from "@rosesfield/ui/components/badge"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { interaction } from "@rosesfield/ui/components/interaction"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { CheckIcon } from "lucide-react"
import { memo, type ReactElement, type ReactNode } from "react"

type ModelPickerTag = {
  label: string
  icon?: ReactNode
}

type ModelBadge = {
  kind: BadgeKind
  label: string
  href?: string
  note?: string
  mark?: ReactNode
  markColour?: string
}

type ModelPrice = {
  amount: string
  name: string
}

type ModelPickerRow = {
  id: string
  name: string
  maker: string
  lab?: string
  tags: readonly ModelPickerTag[]
  mark?: ReactNode
  badges?: readonly ModelBadge[]
  price?: ModelPrice
  cost?: number
  released?: string
  isOpen?: boolean
}

function RowBadge({ badge }: { badge: ModelBadge }): ReactElement {
  return (
    <Badge
      kind={badge.kind}
      {...(badge.href === undefined ? {} : { href: badge.href })}
      {...(badge.note === undefined ? {} : { note: badge.note })}
      {...(badge.mark === undefined ? {} : { mark: badge.mark })}
      {...(badge.markColour === undefined
        ? {}
        : { markColour: badge.markColour })}
    >
      {badge.label}
    </Badge>
  )
}

function RowName({ row }: { row: ModelPickerRow }): ReactElement {
  const badges = row.badges ?? []
  const facts = badges.filter((badge) => badge.kind !== "openWeights")
  const weights = badges.filter((badge) => badge.kind === "openWeights")
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

const factLimit = 3

function RowFacts({ row }: { row: ModelPickerRow }): ReactNode {
  const facts = row.tags.slice(0, factLimit)
  if (facts.length === 0) {
    return null
  }
  return (
    <span
      data-slot="model-row-capabilities"
      className="flex h-(--text-caption--line-height) min-w-0 flex-wrap items-center gap-x-s2 overflow-hidden text-caption whitespace-nowrap text-ink-muted"
    >
      {facts.map((fact) => (
        <span
          key={fact.label}
          data-slot="model-row-capability"
          className="inline-flex h-(--text-caption--line-height) shrink-0 items-center gap-s1 [&_svg]:glyph-small"
        >
          {fact.icon}
          {fact.label}
        </span>
      ))}
    </span>
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
      title={price?.name}
      data-state={
        price !== undefined ? "known" : isPricing ? "pending" : "none"
      }
      className="ms-s2 flex w-[calc(2*var(--spacing-s8))] shrink-0 items-center justify-end text-caption text-ink-muted data-[state=none]:ms-0 data-[state=none]:w-0"
    >
      {price !== undefined ? (
        <CreditPrice amount={price.amount} />
      ) : isPricing ? (
        <Skeleton
          data-slot="model-row-price-loading"
          shape="line"
          text="caption"
          measure="full"
        />
      ) : null}
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
        <span
          data-slot="model-row-mark"
          aria-hidden="true"
          className="flex size-icon-dense shrink-0 items-center justify-center rounded-dense bg-(--well) text-ink-muted group-data-[chosen=yes]/row:text-ink [&_svg]:glyph-small"
        >
          {row.mark}
        </span>
        <span className="ms-s2 flex min-w-0 flex-1 flex-col">
          <RowName row={row} />
          <RowFacts row={row} />
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
  ModelRowProps,
}
export { ModelRow, ModelRowSkeleton }
