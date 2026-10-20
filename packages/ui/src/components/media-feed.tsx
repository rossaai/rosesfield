import { useRender } from "@base-ui/react/use-render"
import type { MediaFeedLayout } from "@rosesfield/ui/contracts/media-feed.generated"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import { ArrowUpRightIcon } from "lucide-react"
import type { ComponentProps, ReactElement, ReactNode } from "react"

const columns = {
  masonry: "columns-1 @regular:columns-6",
  row: "columns-2 @regular:columns-4",
} satisfies Record<MediaFeedLayout, string>

const windows = {
  masonry: "max-h-256",
  row: "max-h-224",
} satisfies Record<MediaFeedLayout, string>

type ViewAllProps = Omit<ComponentProps<"a">, "children"> & {
  children: string
  render?: ReactElement
}

function ViewAll({ children, render, className, ...props }: ViewAllProps): ReactElement {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      "data-slot": "media-feed-viewAll",
      className: cn(
        "pointer-events-auto relative inline-flex h-12 shrink-0 items-center gap-2 rounded-card bg-(--well) px-3 font-medium text-body whitespace-nowrap text-ink no-underline",
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
  children: ReactNode
  className?: string
}

function MediaFeed({
  label,
  layout = "masonry",
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
      className={cn("@container flex w-full flex-col", className)}
    >
      {header === undefined ? null : (
        <div data-slot="media-feed-header" className="mb-5">
          {header}
        </div>
      )}
      <div
        data-slot="media-feed-window"
        className={cn("relative overflow-hidden", windows[layout])}
      >
        <div
          data-slot="media-feed-items"
          className={cn(
            "gap-2 *:mb-2 *:break-inside-avoid",
            columns[layout]
          )}
        >
          {children}
        </div>
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

export type { MediaFeedProps, ViewAllProps }
export { MediaFeed, ViewAll }
