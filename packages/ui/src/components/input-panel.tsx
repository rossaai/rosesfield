import { fieldInset } from "@rosesfield/ui/components/input"
import { interaction } from "@rosesfield/ui/components/interaction"
import { useBlockClipped } from "@rosesfield/ui/hooks/use-scroll-ends"
import { cn } from "@rosesfield/ui/lib/cn"
import { type ReactElement, type ReactNode, useRef } from "react"

type InputPanelProps = {
  label: string
  tabs?: ReactNode
  children: ReactNode
  footer: ReactNode
  className?: string
}

function InputPanel({
  label,
  tabs,
  children,
  footer,
  className,
}: InputPanelProps): ReactElement {
  const parts = useRef<HTMLDivElement>(null)
  const isClipped = useBlockClipped(parts)
  return (
    <section
      aria-label={label}
      data-slot="composer"
      data-ground="surface"
      className={cn(
        "flex w-80 shrink-0 flex-col overflow-hidden rounded-card border border-transparent bg-surface",
        className
      )}
    >
      {tabs === undefined ? null : (
        <div data-slot="composer-tray" className="shrink-0 px-s3 pt-s3">
          {tabs}
        </div>
      )}
      <div
        ref={parts}
        data-slot="composer-prompt"
        data-clipped={isClipped ? "yes" : "no"}
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-s3 overflow-y-auto p-s3 [scrollbar-width:none]",
          interaction.ringScroll,
          isClipped ? interaction.fadeEnd : ""
        )}
      >
        {children}
      </div>
      <div
        data-slot="composer-toolbar"
        className="flex shrink-0 items-start px-s3 pb-s3"
      >
        {footer}
      </div>
    </section>
  )
}

type PromptBlockProps = {
  label: string
  children: ReactNode
  chips?: ReactNode
}

function PromptBlock({
  label,
  children,
  chips,
}: PromptBlockProps): ReactElement {
  return (
    <div
      data-slot="composer-prompt-block"
      className={cn(
        "flex w-full flex-col rounded-cell",
        interaction.fieldHostRing
      )}
    >
      <div
        className={cn(
          "relative flex h-31.5 flex-col rounded-t-cell bg-(--well) pt-9 pb-2",
          fieldInset
        )}
      >
        <span
          className={cn(
            "absolute inset-x-0 top-3 font-medium text-label text-ink-muted",
            fieldInset
          )}
        >
          {label}
        </span>
        {children}
      </div>
      {chips === undefined ? null : (
        <div
          className={cn(
            "flex h-11.5 items-start gap-1 rounded-b-cell bg-(--well) pt-2",
            fieldInset
          )}
        >
          {chips}
        </div>
      )}
    </div>
  )
}

function SettingTiles({ children }: { children: ReactNode }): ReactElement {
  return (
    <div
      data-slot="setting-tiles"
      className="flex w-full gap-2 *:h-10 *:min-w-max *:flex-1 *:rounded-dense"
    >
      {children}
    </div>
  )
}

export type { InputPanelProps, PromptBlockProps }
export { InputPanel, PromptBlock, SettingTiles }
