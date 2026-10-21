import { useRender } from "@base-ui/react/use-render"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { MediaFeedLayout } from "@rosesfield/ui/contracts/media-feed.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { ArrowUpRightIcon } from "lucide-react"
import {
  Children,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"

type MediaFeedContent = "media" | "presets"

type StackForm = "row" | "presets"

const stackForms = {
  row: {
    count: 4,
    grid: "@regular:grid-cols-4 @regular:gap-0",
    stack:
      "@regular:pe-2 [&_[data-slot=media]>[data-slot=media-tile]]:origin-bottom [&_[data-slot=media]>[data-slot=media-tile]]:scale-125",
  },
  presets: {
    count: 5,
    grid: "@regular:grid-cols-[repeat(5,minmax(0,--spacing(68.5)))] @regular:justify-center @regular:gap-x-2",
    stack: "",
  },
} satisfies Record<StackForm, { count: number; grid: string; stack: string }>

function stacksOf(children: ReactNode, count: number): ReactNode[][] {
  const items = Children.toArray(children)
  return Array.from({ length: count }, (_, column) =>
    items.filter((_, index) => index % count === column)
  )
}

function FeedStacks({
  form,
  children,
}: {
  form: StackForm
  children: ReactNode
}): ReactElement {
  const { count, grid, stack } = stackForms[form]
  return (
    <div
      data-slot="media-feed-items"
      data-stacks={form}
      className={cn("columns-2 gap-2 @regular:grid @regular:items-start", grid)}
    >
      {stacksOf(children, count).map((items, column) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: a column's place is its identity
          key={column}
          data-slot="media-feed-stack"
          className={cn(
            "contents *:mb-2 *:break-inside-avoid @regular:flex @regular:flex-col @regular:gap-2 @regular:*:mb-0",
            stack
          )}
        >
          {items}
        </div>
      ))}
    </div>
  )
}

const windows = {
  masonry: "max-h-[calc(--spacing(256)+var(--spacing-focus-ring)*4)]",
  row: "max-h-[calc(--spacing(224)+var(--spacing-focus-ring)*4)]",
} satisfies Record<MediaFeedLayout, string>

type ViewAllProps = Omit<ComponentProps<"a">, "children"> & {
  children: string
  render?: ReactElement
}

function ViewAll({
  children,
  render,
  className,
  ...props
}: ViewAllProps): ReactElement {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      "data-slot": "media-feed-viewAll",
      className: cn(
        "pointer-events-auto relative inline-flex h-12 shrink-0 items-center gap-2 rounded-card bg-(--well) px-3 font-medium text-body whitespace-nowrap text-ink no-underline hover:z-1 focus-visible:z-1 in-data-[gallery=hover]:z-1",
        interaction.light,
        interaction.ring,
        className
      ),
      children: (
        <>
          {children}
          <ArrowUpRightIcon aria-hidden="true" className="size-5" />
        </>
      ),
    },
  })
}

type MediaFeedProps = {
  label: string
  layout?: MediaFeedLayout
  header?: ReactNode
  viewAll?: ReactNode
  content?: MediaFeedContent
  children: ReactNode
  className?: string
}

function MediaFeed({
  label,
  layout = "masonry",
  content = "media",
  header,
  viewAll,
  children,
  className,
}: MediaFeedProps): ReactElement {
  return (
    <section
      aria-label={label}
      data-slot="media-feed"
      data-layout={layout}
      data-content={content}
      className={cn("@container flex w-full flex-col", className)}
    >
      {header === undefined ? null : (
        <div data-slot="media-feed-header" className="mb-5">
          {header}
        </div>
      )}
      <div
        data-slot="media-feed-window"
        className={cn(
          "relative overflow-hidden",
          interaction.ringRoom,
          windows[layout]
        )}
      >
        {content === "presets" || layout === "row" ? (
          <FeedStacks form={content === "presets" ? "presets" : "row"}>
            {children}
          </FeedStacks>
        ) : (
          <div
            data-slot="media-feed-items"
            className="columns-1 gap-2 *:mb-2 *:break-inside-avoid @regular:columns-6"
          >
            {children}
          </div>
        )}
        {viewAll === undefined ? null : (
          <div
            data-slot="media-feed-fade"
            className="pointer-events-none absolute inset-x-0 bottom-0 flex h-52 items-end justify-center bg-linear-to-t from-(--ground) to-transparent pb-9"
          >
            {viewAll}
          </div>
        )}
      </div>
    </section>
  )
}

export type { MediaFeedContent, MediaFeedProps, ViewAllProps }
export { FeedStacks, MediaFeed, ViewAll }
