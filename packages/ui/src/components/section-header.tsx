import { useRender } from "@base-ui/react/use-render"
import type { SectionHeadingRhythm } from "@rosesfield/ui/contracts/section-heading.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"

type SectionHeaderProps = {
  title: string
  line?: string
  href?: string
  render?: ReactElement
  actions?: ReactNode
  rhythm?: SectionHeadingRhythm
  className?: string
}

function Title({
  title,
  href,
  render,
}: Pick<SectionHeaderProps, "title" | "href" | "render">): ReactElement {
  const link = useRender({
    defaultTagName: "a",
    render,
    props: {
      href,
      "data-slot": "section-heading-label",
      className: "text-ink no-underline hover:text-hor-text",
      children: title,
    },
  })
  if (href === undefined && render === undefined) {
    return <span data-slot="section-heading-label">{title}</span>
  }
  return link
}

function SectionHeader({
  title,
  line,
  href,
  render,
  actions,
  rhythm = "row",
  className,
}: SectionHeaderProps): ReactElement {
  return (
    <div
      data-slot="section-heading"
      data-rhythm={rhythm}
      className={cn(
        "flex w-full flex-wrap items-end justify-between gap-4",
        className
      )}
    >
      <div data-slot="section-heading-lead" className="flex min-w-0 flex-col gap-1">
        <h2 className="font-medium text-title text-ink">
          <Title
            title={title}
            {...(href === undefined ? {} : { href })}
            {...(render === undefined ? {} : { render })}
          />
        </h2>
        {line === undefined ? null : (
          <p className="text-body text-ink-muted">{line}</p>
        )}
      </div>
      {actions === undefined ? null : (
        <div data-slot="section-heading-actions" className="flex shrink-0 gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}

export type { SectionHeaderProps }
export { SectionHeader }
