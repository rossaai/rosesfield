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

const linkClass =
  "flex h-6 items-center font-medium text-body text-ink no-underline transition-opacity duration-(--duration-control) @regular:hover:opacity-60"

function Group({ group }: { group: FooterGroup }): ReactElement {
  return (
    <section className="flex min-w-0 flex-col">
      <h3 className="font-medium text-body text-ink-muted">{group.heading}</h3>
      <ul className="mt-3 flex flex-col gap-3">
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
        className="w-full bg-surface p-4 @regular:px-4 @regular:py-9"
      >
        <div className="flex flex-col gap-12 @regular:flex-row">
          <h2 className="pe-10 text-title text-ink @regular:w-96 @regular:shrink-0 @regular:text-display">
            {heading}
          </h2>
          <div className="grid min-w-0 max-w-83 flex-1 grid-cols-2 gap-12 @regular:max-w-none @regular:grid-cols-5">
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
