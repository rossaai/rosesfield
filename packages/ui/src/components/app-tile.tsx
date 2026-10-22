import { useRender } from "@base-ui/react/use-render"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { PresetTileForm } from "@rosesfield/ui/contracts/preset-tile.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ComponentProps, ReactElement, ReactNode } from "react"

const form: PresetTileForm = "app"

type AppTileMode = {
  label: string
  icon: ReactNode
}

type AppTileProps = Omit<ComponentProps<"a">, "children" | "media"> & {
  name: string
  line: string
  icon: ReactNode
  badge?: ReactNode
  mode?: AppTileMode
  media?: ReactNode
  render?: ReactElement
}

const wideColumns =
  "@regular:grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_var(--spacing)*15)/6),min(calc((100%_-_var(--spacing)*6)/3),calc((var(--spacing)*336_-_100%)*1000))),1fr))]"

function ModePill({ mode }: { mode: AppTileMode }): ReactElement {
  return (
    <span
      data-slot="app-tile-mode"
      className="material-thin absolute top-s4 right-s4 hidden h-button-small items-center gap-s1 rounded-full px-s2_5 text-label text-ink [&_svg]:glyph-small @regular:flex"
    >
      <span aria-hidden="true" className="flex">
        {mode.icon}
      </span>
      {mode.label}
    </span>
  )
}

function TileText({
  name,
  line,
  badge,
}: Pick<AppTileProps, "name" | "line" | "badge">): ReactElement {
  return (
    <span className="flex min-w-0 flex-col gap-s1">
      <span className="flex min-w-0 items-center gap-s1">
        <span
          data-slot="preset-tile-name"
          className="truncate font-medium text-body"
        >
          {name}
        </span>
        {badge === undefined ? null : (
          <span data-slot="app-tile-badge" className="flex shrink-0">
            {badge}
          </span>
        )}
      </span>
      <span
        data-slot="preset-tile-line"
        className="truncate text-label text-ink-muted"
      >
        {line}
      </span>
    </span>
  )
}

function AppTile({
  name,
  line,
  icon,
  badge,
  mode,
  media,
  render,
  className,
  ...props
}: AppTileProps): ReactElement {
  const hasMedia = media !== undefined && media !== null
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      "data-slot": "preset-tile",
      "data-form": form,
      "data-media": hasMedia ? "yes" : "no",
      className: cn(
        "group/app relative flex min-w-0 flex-col gap-s4 rounded-card bg-(--well) p-s4 text-ink no-underline",
        hasMedia ? "" : "h-33.5 justify-between @regular:h-32.5",
        motion.press,
        interaction.ring,
        className
      ),
      children: (
        <>
          {hasMedia ? (
            <span
              data-slot="app-tile-media"
              className="relative block aspect-video overflow-hidden rounded-cell *:size-full *:object-cover"
            >
              {media}
            </span>
          ) : (
            <span aria-hidden="true" className="flex [&_svg]:glyph">
              {icon}
            </span>
          )}
          <TileText name={name} line={line} badge={badge} />
          {mode === undefined ? null : <ModePill mode={mode} />}
        </>
      ),
    },
  })
}

function AppTileGrid({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): ReactElement {
  return (
    <nav aria-label={label} data-slot="app-tile-grid">
      <div className={cn("grid grid-cols-2 gap-2 @regular:gap-3", wideColumns)}>
        {children}
      </div>
    </nav>
  )
}

export type { AppTileMode, AppTileProps }
export { AppTile, AppTileGrid }
