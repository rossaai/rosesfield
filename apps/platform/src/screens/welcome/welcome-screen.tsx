import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Card } from "@rosesfield/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { PreviewSlot } from "@rosesfield/ui/components/preview-slot"
import { cn } from "@rosesfield/ui/lib/cn"
import { Link } from "@tanstack/react-router"
import { MenuIcon } from "lucide-react"
import { type ReactElement, useEffect } from "react"
import {
  appLine,
  appName,
  aspectOf,
  defaultAspectOf,
} from "@/catalog/app-facts"
import { catalogApps } from "@/catalog/catalog-apps"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { AccordionList } from "@/pieces/accordion-list"
import { CodeBlock } from "@/pieces/copy-button"
import { isLandingPage } from "@/screens/welcome/landing-page"
import { ModelsList } from "@/screens/welcome/models-list"
import {
  repository,
  runCommands,
  sponsorAddress,
} from "@/screens/welcome/welcome-links"
import { sections, WelcomeSection } from "@/screens/welcome/welcome-sections"
import { markWelcomeSeen } from "@/screens/welcome/welcome-seen"
import { useScrolledPast } from "@/shell/screen-header"

const navLinks: ReadonlyArray<{ id: string; label: CopyKey }> = [
  { id: "apps", label: "welcome.nav.apps" },
  { id: "terms", label: "welcome.nav.terms" },
  { id: "built", label: "welcome.nav.built" },
  { id: "questions", label: "welcome.nav.questions" },
]

const questionNumbers: ReadonlyArray<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8> = [
  1, 2, 3, 4, 5, 6, 7, 8,
]

function PrimaryAction(): ReactElement {
  if (isLandingPage()) {
    return (
      <Button
        tone="primary"
        render={<a href={repository} />}
        nativeButton={false}
      >
        {t("welcome.action.code")}
      </Button>
    )
  }
  return (
    <Button tone="primary" render={<Link to="/" />} nativeButton={false}>
      {t("welcome.action.open")}
    </Button>
  )
}

function WelcomeHeader({ isHeroPast }: { isHeroPast: boolean }): ReactElement {
  const [sentinel, isScrolled] = useScrolledPast()
  return (
    <>
      <span ref={sentinel} aria-hidden="true" className="block h-0" />
      <header
        className={cn(
          "sticky top-0 z-10 flex h-header items-center gap-s4 bg-canvas px-s5 @regular:px-s6",
          isScrolled ? "shadow-seam" : ""
        )}
      >
        <span className="text-body font-medium">{t("shell.name")}</span>
        <nav className="hidden flex-1 items-center gap-s2 @regular:flex">
          {navLinks.map((link) => (
            <Button
              key={link.id}
              tone="quiet"
              size="small"
              render={<a href={`#${link.id}`} />}
              nativeButton={false}
            >
              {t(link.label)}
            </Button>
          ))}
        </nav>
        <span className="flex-1 @regular:hidden" />
        <span
          aria-hidden={!isHeroPast}
          className={cn("flex", isHeroPast ? "" : "invisible")}
        >
          <PrimaryAction />
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <IconButton
                label={t("welcome.nav.menu")}
                className="@regular:hidden"
              >
                <MenuIcon aria-hidden="true" />
              </IconButton>
            }
          />
          <DropdownMenuContent align="end">
            {navLinks.map((link) => (
              <DropdownMenuItem
                key={link.id}
                render={<a href={`#${link.id}`} />}
              >
                {t(link.label)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </>
  )
}

function AppsGrid(): ReactElement {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(max(calc(2*var(--spacing-tile)),calc((100%-3*var(--spacing-s3))/4)),1fr))] gap-s3">
      {catalogApps.map((app) => (
        <Card key={app.id} ground="canvas" className="gap-s3 p-0">
          <PreviewSlot
            aspect={aspectOf(defaultAspectOf(app))}
            label={t("previewSlot.label")}
          />
          <div className="flex flex-col gap-s1">
            <h3 className="truncate text-body font-medium">{appName(app)}</h3>
            <p className="text-body text-ink-muted">{appLine(app)}</p>
          </div>
        </Card>
      ))}
    </div>
  )
}

function SponsorLine(): ReactElement {
  const [before = "", after = ""] = t("welcome.footer.sponsor", {
    address: sponsorAddress,
  }).split(sponsorAddress)
  return (
    <p className="text-body">
      {before}
      <a
        className="text-body text-hor-text underline"
        href={`mailto:${sponsorAddress}`}
      >
        {sponsorAddress}
      </a>
      {after}
    </p>
  )
}

function Footer(): ReactElement {
  const linkClass = "text-body text-hor-text underline"
  return (
    <footer className="flex flex-col gap-s4 pb-s12">
      <PrimaryAction />
      <div className="flex flex-wrap gap-s4">
        <a className={linkClass} href={repository}>
          {t("welcome.footer.code")}
        </a>
        <a className={linkClass} href={`${repository}/blob/main/LICENSE`}>
          {t("welcome.footer.licence")}
        </a>
        <a className={linkClass} href={`${repository}/blob/main/TRADEMARKS.md`}>
          {t("welcome.footer.trademarks")}
        </a>
      </div>
      <SponsorLine />
      <p className="text-legal text-ink-muted">
        {t("welcome.footer.trademark")}
      </p>
      <p className="text-legal text-ink-muted">{t("welcome.footer.maker")}</p>
    </footer>
  )
}

function RunSteps(): ReactElement {
  return (
    <div className="flex flex-col gap-s3 pt-s2">
      <p className="text-body">{t("welcome.terms.steps")}</p>
      <CodeBlock code={runCommands} />
      <p className="text-body">{t("welcome.terms.open")}</p>
      <a
        className="text-body text-hor-text underline"
        href={`${repository}#install`}
      >
        {t("welcome.terms.action")}
      </a>
    </div>
  )
}

function Questions(): ReactElement {
  return (
    <AccordionList
      entries={questionNumbers.map((number) => ({
        key: String(number),
        title: t(`welcome.question.${number}.title`),
        body: t(`welcome.question.${number}.body`),
      }))}
    />
  )
}

export function WelcomeScreen(): ReactElement {
  useEffect(markWelcomeSeen, [])
  const [heroAction, isHeroPast] = useScrolledPast()
  return (
    <div className="@container min-h-dvh bg-canvas text-ink">
      <WelcomeHeader isHeroPast={isHeroPast} />
      <main className="mx-auto flex w-full max-w-[calc(2*var(--container-regular))] flex-col gap-s12 px-s5 pt-s12 @regular:px-s6">
        <WelcomeSection spec={sections.hero} isDisplay={true}>
          <div ref={heroAction} className="pt-s2">
            <PrimaryAction />
          </div>
        </WelcomeSection>
        <WelcomeSection spec={sections.apps} wide={<AppsGrid />} />
        <WelcomeSection spec={sections.library} isMediaFirst={true} />
        <WelcomeSection spec={sections.agent} />
        <WelcomeSection spec={sections.connect} />
        <WelcomeSection spec={sections.terms}>
          <RunSteps />
        </WelcomeSection>
        <WelcomeSection spec={sections.built}>
          <a
            className="text-body text-hor-text underline"
            href={`${repository}/blob/main/docs/architecture.md`}
          >
            {t("welcome.built.action")}
          </a>
        </WelcomeSection>
        <WelcomeSection spec={sections.models} wide={<ModelsList />} />
        <WelcomeSection spec={sections.questions} showSubtitle={false}>
          <Questions />
        </WelcomeSection>
        <Footer />
      </main>
    </div>
  )
}
