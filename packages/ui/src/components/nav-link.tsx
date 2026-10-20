import { useRender } from "@base-ui/react/use-render"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ComponentProps, ReactElement, ReactNode } from "react"

const navLinkClass = cn(
  "inline-flex h-7 shrink-0 items-center rounded-dense px-2 py-1 font-medium text-body whitespace-nowrap text-ink-muted no-underline select-none hover:text-ink in-data-[gallery=hover]:text-ink in-data-[gallery=press]:text-ink aria-[current=page]:text-ink data-popup-open:bg-(--tint) data-popup-open:text-ink",
  interaction.fill,
  interaction.ring
)

type NavLinkProps = Omit<ComponentProps<"a">, "children"> & {
  children: string
  current?: boolean
  badge?: ReactNode
  render?: ReactElement
}

function NavLink({
  children,
  current = false,
  badge,
  render,
  className,
  ...props
}: NavLinkProps): ReactElement {
  return useRender({
    defaultTagName: "a",
    render,
    props: {
      ...props,
      "data-slot": "app-bar-areas",
      "aria-current": current ? "page" : undefined,
      className: cn(navLinkClass, className),
      children: (
        <>
          {children}
          {badge}
        </>
      ),
    },
  })
}

function NavSeparator(): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-slot="nav-separator"
      className="mx-1 h-3 w-px shrink-0 bg-(--line)"
    />
  )
}

type AreaApp = {
  id: string
  name: string
  line: string
  icon: ReactNode
  href: string
}

type AreaMenuProps = {
  children: string
  apps: ReadonlyArray<AreaApp>
  current?: boolean
  defaultOpen?: boolean
  renderLink?: (app: AreaApp) => ReactElement
}

function AreaMenu({
  children,
  apps,
  current = false,
  defaultOpen = false,
  renderLink,
}: AreaMenuProps): ReactElement {
  return (
    <DropdownMenu defaultOpen={defaultOpen}>
      <DropdownMenuTrigger
        data-slot="app-bar-areas"
        aria-current={current ? "page" : undefined}
        className={navLinkClass}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-slot="app-bar-areaMenu"
        sideOffset={4}
        className="max-w-none min-w-72"
      >
        {apps.map((app) => (
          <DropdownMenuItem
            key={app.id}
            render={
              renderLink?.(app) ?? ((props) => <a {...props} href={app.href} />)
            }
            className="items-start"
          >
            <span aria-hidden="true" className="mt-0.5 flex [&_svg]:size-5">
              {app.icon}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="font-medium text-body text-ink">{app.name}</span>
              <span className="truncate text-label text-ink-muted">
                {app.line}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export type { AreaApp, AreaMenuProps, NavLinkProps }
export { AreaMenu, NavLink, NavSeparator }
