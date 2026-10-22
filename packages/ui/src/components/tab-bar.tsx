import { useRender } from "@base-ui/react/use-render"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { AppBarPlace } from "@rosesfield/ui/contracts/app-bar.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { SparkleIcon } from "lucide-react"
import type { ComponentProps, ReactElement, ReactNode } from "react"

const place: AppBarPlace = "bottom"

const tabBarCover = "[--covered-bottom:0px]"

function TabBar({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): ReactElement {
  return (
    <nav
      aria-label={label}
      data-slot="app-bar"
      data-place={place}
      className={cn(
        "material sticky bottom-0 z-40 w-full p-s1 pb-[calc(var(--spacing-s1)+env(safe-area-inset-bottom))] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-hairline before:-scale-y-100 before:shadow-seam dark:before:shadow-none @regular:hidden"
      )}
    >
      <div
        data-slot="app-bar-tabs"
        className="grid h-12 grid-cols-5 items-center"
      >
        {children}
      </div>
    </nav>
  )
}

type TabBarLinkProps = Omit<ComponentProps<"a">, "children"> & {
  children: string
  icon: ReactNode
  current?: boolean
  render?: ReactElement
}

function TabBarLink({
  children,
  icon,
  current = false,
  render,
  className,
  ...props
}: TabBarLinkProps): ReactElement {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      "aria-current": current ? "page" : undefined,
      className: cn(
        "flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-cell p-1.5 text-caption text-ink-muted no-underline hover:text-ink aria-[current=page]:text-ink [&_svg]:size-5",
        motion.press,
        interaction.ring,
        className
      ),
      children: (
        <>
          <span aria-hidden="true" className="flex">
            {icon}
          </span>
          <span className="max-w-full truncate">{children}</span>
        </>
      ),
    },
  })
}

function TabBarGenerate({
  label,
  className,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  label: string
}): ReactElement {
  return (
    <span className="flex justify-center">
      <button
        type="button"
        aria-label={label}
        data-slot="app-bar-tabGenerate"
        className={cn(
          "flex h-field w-16.5 items-center justify-center rounded-cell bg-ink text-canvas [&_svg]:glyph",
          motion.press,
          interaction.ring,
          className
        )}
        {...props}
      >
        <SparkleIcon aria-hidden="true" />
      </button>
    </span>
  )
}

export type { TabBarLinkProps }
export { TabBar, TabBarGenerate, TabBarLink, tabBarCover }
