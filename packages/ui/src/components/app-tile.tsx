import { useRender } from "@base-ui/react/use-render"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { PresetTileForm } from "@rosesfield/ui/contracts/preset-tile.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ComponentProps, ReactElement, ReactNode } from "react"

const form: PresetTileForm = "app"

type AppTileMode = {
  label: string
  icon: ReactNode
}

type AppTileProps = Omit<ComponentProps<"a">, "children"> & {
  name: string
  line: string
  icon: ReactNode
  badge?: ReactNode
  mode?: AppTileMode
  render?: ReactElement
}

const openRing =
  "hover:border-transparent hover:p-0 in-data-[gallery=hover]:border-transparent in-data-[gallery=hover]:p-0"

const wideColumns =
  "@regular:grid-cols-[repeat(auto-fill,minmax(max(calc((100%_-_var(--spacing)*15)/6),min(calc((100%_-_var(--spacing)*6)/3),calc((var(--spacing)*336_-_100%)*1000))),1fr))]"

const panelGrows = "group-hover/app:p-4 in-data-[gallery=hover]:p-4"

function ModePill({ mode }: { mode: AppTileMode }): ReactElement {
  return (
    <span
      data-slot="app-tile-mode"
      className="material-thin absolute top-3 right-3 hidden h-7.5 items-center gap-1 rounded-full px-2.5 text-label text-ink [&_svg]:size-3.5 @regular:flex"
    >
      <span aria-hidden="true" className="flex">
        {mode.icon}
      </span>
      {mode.label}
    </span>
  )
}

function AppTile({
  name,
  line,
  icon,
  badge,
  mode,
  render,
  className,
  ...props
}: AppTileProps): ReactElement {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      "data-slot": "preset-tile",
      "data-form": form,
      className: cn(
        "group/app relative flex h-33.5 min-w-0 rounded-card border border-(--line) p-0.5 text-ink no-underline transition-[padding,border-color] duration-(--duration-control) @regular:h-32.5",
        openRing,
        interaction.ring,
        className
      ),
      children: (
        <>
          <span
            data-slot="app-tile-panel"
            className={cn(
              "relative flex min-w-0 flex-1 flex-col justify-between rounded-item bg-(--well) p-3.5 transition-[padding] duration-(--duration-control)",
              panelGrows
            )}
          >
            <span aria-hidden="true" className="flex [&_svg]:size-5">
              {icon}
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex min-w-0 items-center">
                <span
                  data-slot="preset-tile-name"
                  className="truncate font-medium text-body"
                >
                  {name}
                </span>
                {badge === undefined ? null : (
                  <span
                    data-slot="app-tile-badge"
                    className="absolute top-3 right-3 flex -skew-x-12 @regular:static @regular:ms-0.5"
                  >
                    {badge}
                  </span>
                )}
              </span>
              <span
                data-slot="preset-tile-line"
                className="truncate text-body text-ink-muted @regular:text-label"
              >
                {line}
              </span>
            </span>
          </span>
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
