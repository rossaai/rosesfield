import type { ReactElement, ReactNode } from "react"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { legalLinkClass } from "@/screens/legal/legal-links"
import { Lockup } from "@/shell/brand-mark"
import { ShellFooter } from "@/shell/shell-footer"

export type LegalSection = {
  id: string
  title: CopyKey
  body: readonly CopyKey[]
  link?: { href: string; label: CopyKey }
  extra?: ReactNode
}

type LegalPageProps = {
  title: CopyKey
  line: CopyKey
  intro?: CopyKey
  sections: readonly LegalSection[]
}

function SectionView({ section }: { section: LegalSection }): ReactElement {
  return (
    <section
      id={section.id}
      data-slot="legal-section"
      className="flex flex-col gap-s2"
    >
      <h2 className="text-body font-medium">{t(section.title)}</h2>
      {section.body.map((key) => (
        <p key={key} className="text-body">
          {t(key)}
        </p>
      ))}
      {section.link === undefined ? null : (
        <a
          href={section.link.href}
          className={legalLinkClass}
          target="_blank"
          rel="noreferrer"
        >
          {t(section.link.label)}
        </a>
      )}
      {section.extra}
    </section>
  )
}

export function LegalPage({
  title,
  line,
  intro,
  sections,
}: LegalPageProps): ReactElement {
  return (
    <div className="@container flex min-h-dvh flex-col bg-canvas text-ink">
      <header className="flex h-header shrink-0 items-center px-s5 @regular:px-s6">
        <a href="/" className="flex">
          <Lockup />
        </a>
      </header>
      <main
        data-slot="legal-page"
        className="mx-auto flex w-full max-w-prose-max min-w-0 flex-col gap-s6 px-s5 pt-s8 pb-s12 wrap-anywhere"
      >
        <div className="flex flex-col gap-s2">
          <h1 className="text-title">{t(title)}</h1>
          <p className="text-body text-ink-muted">{t(line)}</p>
          {intro === undefined ? null : (
            <p className="text-body">{t(intro)}</p>
          )}
        </div>
        {sections.map((section) => (
          <SectionView key={section.id} section={section} />
        ))}
      </main>
      <div className="mt-auto">
        <ShellFooter />
      </div>
    </div>
  )
}
