import { useRender } from "@base-ui/react/use-render"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { PresetTileForm } from "@rosesfield/ui/contracts/preset-tile.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ComponentProps, ReactElement, ReactNode } from "react"

const form: PresetTileForm = "app"

type AppTileProps = Omit<ComponentProps<"a">, "children"> & {
  name: string
  line: string
  icon: ReactNode
  badge?: ReactNode
  render?: ReactElement
}

function AppTile({
  name,
  line,
  icon,
  badge,
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
        "relative flex h-33.5 min-w-0 flex-col justify-between rounded-card bg-(--well) p-3.5 text-ink no-underline @regular:h-32.5",
        interaction.light,
        interaction.ring,
        className
      ),
      children: (
        <>
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
              {badge}
            </span>
            <span
              data-slot="preset-tile-line"
              className="truncate text-label text-ink-muted"
            >
              {line}
            </span>
          </span>
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
      <div className="grid grid-cols-2 gap-2 @regular:grid-cols-3 @regular:gap-3">
        {children}
      </div>
    </nav>
  )
}

export type { AppTileProps }
export { AppTile, AppTileGrid }
