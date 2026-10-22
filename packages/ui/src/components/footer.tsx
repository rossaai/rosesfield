import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import type { ReactElement } from "react"

type FooterLink = {
  id: string
  label: string
  href: string
}

type FooterGroup = {
  id: string
  heading: string
  links: ReadonlyArray<FooterLink>
}

type FooterProps = {
  label: string
  heading: string
  groups: ReadonlyArray<FooterGroup>
}

const linkClass = cn(
  "flex h-s8 items-center font-medium text-body text-ink no-underline hover:text-ink-muted",
  motion.tint
)

function Group({ group }: { group: FooterGroup }): ReactElement {
  return (
    <section className="flex min-w-0 flex-col">
      <h3 className="font-medium text-body text-ink-muted">{group.heading}</h3>
      <ul className="mt-s2 flex flex-col">
        {group.links.map((link) => (
          <li key={link.id}>
            <a href={link.href} className={linkClass}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Footer({ label, heading, groups }: FooterProps): ReactElement {
  return (
    <footer
      role="contentinfo"
      aria-label={label}
      data-slot="footer"
      className="@container w-full"
    >
      <div
        data-ground="surface"
        className="w-full bg-surface px-s5 py-s6 @regular:py-s12"
      >
        <div className="grid gap-s12 @regular:grid-cols-3">
          <h2 className="text-title text-ink">{heading}</h2>
          <div className="grid min-w-0 grid-cols-2 gap-s6 @regular:col-span-2 @regular:auto-cols-fr @regular:grid-flow-col @regular:grid-cols-none">
            {groups.map((group) => (
              <Group key={group.id} group={group} />
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

export type { FooterGroup, FooterLink, FooterProps }
export { Footer }
