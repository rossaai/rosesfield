import { useRender } from "@base-ui/react/use-render"
import { interaction } from "@rosesfield/ui/components/interaction"
import type { AppBarPlace } from "@rosesfield/ui/contracts/app-bar.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { SparkleIcon } from "lucide-react"
import type { ComponentProps, ReactElement, ReactNode } from "react"

const place: AppBarPlace = "bottom"

const press =
  "transition-[opacity,translate] duration-(--duration-control) active:translate-y-0.5 in-data-[gallery=press]:translate-y-0.5"

const linkPress = "active:opacity-60 in-data-[gallery=press]:opacity-60"

const generatePress = "active:opacity-90 in-data-[gallery=press]:opacity-90"

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
      className="sticky bottom-0 z-40 w-full border-t border-transparent p-1 pb-[calc(var(--spacing)+env(safe-area-inset-bottom))] @regular:hidden"
    >
      <div
        aria-hidden="true"
        data-slot="app-bar-glow"
        className="pointer-events-none absolute inset-x-0 -top-9 bottom-0 -z-1 bg-linear-to-b from-transparent to-canvas to-[calc(var(--spacing)*8.75)]"
      />
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
        "flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 p-1.5 text-caption text-ink-muted no-underline aria-[current=page]:text-ink [&_svg]:size-5",
        press,
        linkPress,
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
          "flex h-11 w-16.5 items-center justify-center rounded-card bg-ink text-canvas [&_svg]:size-6",
          press,
          generatePress,
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
export { TabBar, TabBarGenerate, TabBarLink }
