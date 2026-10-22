import { Badge, type BadgeKind } from "@rosesfield/ui/components/badge"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import { interaction } from "@rosesfield/ui/components/interaction"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { cn } from "@rosesfield/ui/lib/cn"
import { CheckIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"

type ModelPickerTag = {
  label: string
  icon?: ReactNode
}

type ModelBadge = {
  kind: BadgeKind
  label: string
  href?: string
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
  line: string | null
  tags: readonly ModelPickerTag[]
  mark?: ReactNode
  badges?: readonly ModelBadge[]
  price?: ModelPrice
}

function RowBadge({ badge }: { badge: ModelBadge }): ReactElement {
  return (
    <Badge
      kind={badge.kind}
      {...(badge.href === undefined ? {} : { href: badge.href })}
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

function RowLine({ row }: { row: ModelPickerRow }): ReactNode {
  if (row.line === null && row.tags.length === 0) {
    return null
  }
  return (
    <span
      data-slot="model-row-line"
      className="flex min-w-0 flex-wrap items-center gap-x-1 overflow-hidden text-caption whitespace-nowrap text-ink-muted"
    >
      {row.line === null ? null : (
        <span data-slot="model-row-words" className="max-w-full truncate">
          {row.line}
        </span>
      )}
      {row.tags.length === 0 ? null : (
        <span
          data-slot="model-row-tags"
          className="flex max-w-full shrink-0 gap-1 overflow-hidden"
        >
          {row.tags.map((tag) => (
            <span
              key={tag.label}
              className="inline-flex shrink-0 items-center gap-0.5 rounded-dense bg-(--tint) px-1 [&_svg]:size-3"
            >
              {tag.icon}
              {tag.label}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}

function RowPrice({
  price,
  isPricing,
}: {
  price: ModelPrice | undefined
  isPricing: boolean
}): ReactNode {
  if (price !== undefined) {
    return (
      <CreditPrice
        amount={price.amount}
        className="ms-2 shrink-0 text-caption text-ink-muted"
      />
    )
  }
  return isPricing ? (
    <Skeleton
      data-slot="model-row-price-loading"
      className="ms-2 h-3 w-8 shrink-0 rounded-dense"
    />
  ) : null
}

function ModelRow({
  row,
  isChosen,
  isPricing,
  onChoose,
}: {
  row: ModelPickerRow
  isChosen: boolean
  isPricing: boolean
  onChoose: (id: string) => void
}): ReactElement {
  return (
    <div
      role="none"
      data-slot="model-row"
      data-chosen={isChosen ? "yes" : "no"}
      className="group/row relative mx-3 h-13 rounded-cell data-[chosen=yes]:bg-(--tint)"
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
          "absolute inset-0 rounded-cell outline-none",
          interaction.light,
          interaction.ring
        )}
        onClick={() => onChoose(row.id)}
      />
      <span className="pointer-events-none relative flex h-full items-center ps-1.5 pe-3">
        <span
          data-slot="model-row-mark"
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-dense bg-(--tint) text-ink-muted group-data-[chosen=yes]/row:text-ink [&_svg]:size-4"
        >
          {row.mark}
        </span>
        <span className="ms-2 flex min-w-0 flex-1 flex-col">
          <RowName row={row} />
          <RowLine row={row} />
        </span>
        <RowPrice price={row.price} isPricing={isPricing} />
        <span data-slot="model-row-check" className="flex size-5 shrink-0">
          {isChosen ? (
            <CheckIcon aria-hidden="true" className="size-5" />
          ) : null}
        </span>
      </span>
    </div>
  )
}

export type { ModelBadge, ModelPickerRow, ModelPickerTag, ModelPrice }
export { ModelRow }
