import { AppBar, AppBarAction } from "@rosesfield/ui/components/app-bar"
import { Badge } from "@rosesfield/ui/components/badge"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Footer } from "@rosesfield/ui/components/footer"
import { HeroBanner, HeroFan } from "@rosesfield/ui/components/hero"
import {
  AreaMenu,
  NavLink,
  NavSeparator,
} from "@rosesfield/ui/components/nav-link"
import { SectionHeader } from "@rosesfield/ui/components/section-header"
import {
  TabBar,
  TabBarGenerate,
  TabBarLink,
} from "@rosesfield/ui/components/tab-bar"
import {
  CoinsIcon,
  CompassIcon,
  HistoryIcon,
  ImageIcon,
  LibraryIcon,
  MenuIcon,
  PlugIcon,
} from "lucide-react"
import type { ReactElement } from "react"
import { t } from "@/gallery/copy.en"
import demoSquare from "@/gallery/fixtures/demo-image-1-1.png"
import demoTall from "@/gallery/fixtures/demo-image-9-16.png"
import demoWide from "@/gallery/fixtures/demo-image-16-9.png"
import type { GalleryEntry } from "@/gallery/gallery-entry"
import { frameState, interactionStates } from "@/gallery/reference-frames"
import { FieldMark, Lockup } from "@/shell/brand-mark"

const apps = [
  {
    id: "image",
    name: t("sample.nav.image"),
    line: t("sample.appTile.line"),
    icon: <ImageIcon />,
    href: "?app=image",
  },
]

function Areas({ open }: { open?: boolean }): ReactElement {
  return (
    <>
      <NavLink href="?area=explore" current>
        {t("sample.nav.explore")}
      </NavLink>
      <AreaMenu apps={apps} {...(open === true ? { defaultOpen: true } : {})}>
        {t("sample.nav.image")}
      </AreaMenu>
      <NavLink
        href="?area=video"
        badge={<Badge kind="new">{t("sample.badge.new")}</Badge>}
      >
        {t("sample.nav.video")}
      </NavLink>
      <NavLink href="?area=audio">{t("sample.nav.audio")}</NavLink>
      <NavSeparator />
      <NavLink href="?area=library">{t("sample.nav.library")}</NavLink>
      <NavLink href="?area=history">{t("sample.nav.history")}</NavLink>
    </>
  )
}

function Bar({
  density,
  open,
}: {
  density: "full" | "compact"
  open?: boolean
}): ReactElement {
  return (
    <div className="-mx-4 -mt-6">
      <AppBar
        label={t("sample.name")}
        density={density}
        mark={<FieldMark className="size-full" />}
        lockup={<Lockup className="h-8" />}
        areas={<Areas {...(open === true ? { open } : {})} />}
        areaMenu={
          <IconButton label={t("sample.nav.areas")} tone="quiet" place="bar">
            <MenuIcon aria-hidden="true" />
          </IconButton>
        }
        balance={
          <AppBarAction icon={<CoinsIcon aria-hidden="true" />}>
            {t("sample.nav.balance")}
          </AppBarAction>
        }
        connect={
          <AppBarAction tone="primary">{t("sample.nav.connect")}</AppBarAction>
        }
      />
    </div>
  )
}

function Tabs(): ReactElement {
  return (
    <div className="-mx-4 flex h-150 flex-col justify-end">
      <TabBar label={t("sample.nav.areas")}>
        <TabBarLink href="?tab=explore" icon={<CompassIcon />} current>
          {t("sample.nav.explore")}
        </TabBarLink>
        <TabBarLink href="?tab=library" icon={<LibraryIcon />}>
          {t("sample.nav.library")}
        </TabBarLink>
        <TabBarGenerate label={t("sample.nav.generate")} />
        <TabBarLink href="?tab=history" icon={<HistoryIcon />}>
          {t("sample.nav.history")}
        </TabBarLink>
        <TabBarLink href="?tab=connect" icon={<PlugIcon />}>
          {t("sample.nav.connect")}
        </TabBarLink>
      </TabBar>
    </div>
  )
}

function FooterDemo(): ReactElement {
  return (
    <div className="-mx-4">
      <Footer
        label={t("sample.name")}
        heading={t("sample.footer.heading")}
        groups={[
          {
            id: "project",
            heading: t("sample.footer.project"),
            links: [
              {
                id: "code",
                label: t("sample.footer.code"),
                href: "https://github.com/",
              },
              {
                id: "challenge",
                label: t("sample.footer.challenge"),
                href: "?challenge",
              },
            ],
          },
          {
            id: "legal",
            heading: t("sample.footer.legal"),
            links: [
              {
                id: "privacy",
                label: t("sample.footer.privacy"),
                href: "?privacy",
              },
              { id: "terms", label: t("sample.footer.terms"), href: "?terms" },
            ],
          },
        ]}
      />
    </div>
  )
}

function Hero(): ReactElement {
  return (
    <div className="flex flex-col gap-12">
      <HeroBanner
        href="?app=video"
        kicker={t("sample.banner.kicker")}
        headline={t("sample.banner.headline")}
        lead={t("sample.banner.lead")}
        action={t("sample.banner.action")}
      />
      <HeroFan
        pictures={[demoTall, demoSquare, demoWide, demoTall].map(
          (src, index) => ({
            id: String(index),
            src,
          })
        )}
        headline={t("sample.fan.headline")}
        model={t("sample.model")}
        line={t("sample.fan.line")}
      />
    </div>
  )
}

function Header(): ReactElement {
  return (
    <SectionHeader
      title={t("sample.section.title")}
      line={t("sample.section.line")}
      href="?entry=ref-gallery-grid"
      actions={
        <>
          <Button size="hero" tone="primary">
            {t("sample.start")}
          </Button>
          <Button size="hero">{t("sample.learnMore")}</Button>
        </>
      }
    />
  )
}

export const referenceShellEntries: GalleryEntry[] = [
  {
    id: "ref-top-bar",
    unit: "top-bar",
    title: "ref.topBar",
    states: [
      ...interactionStates(() => <Bar density="full" />),
      frameState("compact", "state.compact", () => <Bar density="compact" />),
    ],
  },
  {
    id: "ref-nav-link",
    unit: "nav-link",
    title: "ref.navLink",
    states: [
      ...interactionStates(() => <Bar density="full" />),
      frameState("open", "state.open", () => <Bar density="full" open />),
    ],
  },
  {
    id: "ref-phone-tab-bar",
    unit: "phone-tab-bar",
    title: "ref.tabBar",
    states: interactionStates(() => <Tabs />),
  },
  {
    id: "ref-footer",
    unit: "footer",
    title: "ref.footer",
    states: interactionStates(() => <FooterDemo />),
  },
  {
    id: "ref-hero",
    unit: "hero",
    title: "ref.hero",
    states: interactionStates(() => <Hero />),
  },
  {
    id: "ref-section-header",
    unit: "section-header",
    title: "ref.sectionHeader",
    states: interactionStates(() => <Header />),
  },
]
