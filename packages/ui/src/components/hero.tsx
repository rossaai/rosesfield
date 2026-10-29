import { buttonVariants } from "@rosesfield/ui/components/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  focusClass,
  type MediaFocus,
} from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"

type HeroTag = {
  label: string
  icon: ReactNode
}

type HeroPortrait = {
  src: string
  focus?: MediaFocus
}

type HeroPortraits = {
  start?: HeroPortrait
  end?: HeroPortrait
}

type HeroBannerProps = {
  href: string
  headline: string
  lead: string
  action: string
  art?: ReactNode
  tag?: HeroTag
  portraits?: HeroPortraits
}

const sides: ReadonlyArray<keyof HeroPortraits> = ["start", "end"]

const portraitSides = {
  start: "left-0 mask-r-from-60%",
  end: "right-0 mask-l-from-60%",
} satisfies Record<keyof HeroPortraits, string>

function Portraits({
  portraits,
}: {
  portraits: HeroPortraits
}): ReactElement[] {
  return sides.flatMap((side) => {
    const portrait = portraits[side]
    return portrait === undefined
      ? []
      : [
          <img
            key={side}
            src={portrait.src}
            alt=""
            data-slot="hero-portrait"
            data-side={side}
            className={cn(
              "absolute bottom-0 hidden h-full w-(--hero-portrait) object-cover @regular:block",
              portraitSides[side],
              portrait.focus === undefined ? "" : focusClass[portrait.focus]
            )}
          />,
        ]
  })
}

function PhonePortraits({
  portraits,
}: {
  portraits: HeroPortraits
}): ReactElement {
  return (
    <span
      aria-hidden="true"
      data-slot="hero-phone-portraits"
      className="flex w-full @regular:hidden"
    >
      {sides.flatMap((side) => {
        const portrait = portraits[side]
        return portrait === undefined
          ? []
          : [
              <img
                key={side}
                src={portrait.src}
                alt=""
                data-side={side}
                className={cn(
                  "aspect-square min-w-0 flex-1 object-cover",
                  portrait.focus === undefined ? "" : focusClass[portrait.focus]
                )}
              />,
            ]
      })}
    </span>
  )
}

function Tag({ tag }: { tag: HeroTag }): ReactElement {
  return (
    <span
      data-slot="hero-tag"
      className="mb-s6 inline-flex h-button-small items-center gap-s1 rounded-full bg-hor-tint ps-s2 pe-s3 font-medium text-body text-hor-text [&_svg]:glyph-small"
    >
      <span aria-hidden="true" className="flex">
        {tag.icon}
      </span>
      {tag.label}
    </span>
  )
}

const statement =
  "text-[clamp(var(--text-statement-floor),calc(var(--text-statement-share)*100vw),var(--text-statement-ceiling))] leading-(--text-statement-leading) tracking-(--text-display--letter-spacing)"

function HeroBanner(props: HeroBannerProps): ReactElement {
  return (
    <a
      data-slot="hero"
      href={props.href}
      className={cn(
        "group/hero @container/hero relative mt-s4 flex w-full flex-col overflow-hidden @regular:flex-row rounded-vessel bg-surface text-ink no-underline [--hero-portrait:min(--spacing(75),calc((100cqw_-_var(--spacing)*146)/2))] @regular:mt-s6 @regular:min-h-100",
        interaction.ring
      )}
    >
      {props.art === undefined ? null : (
        <span
          aria-hidden="true"
          className="absolute inset-0 *:size-full *:object-cover"
        >
          {props.art}
        </span>
      )}
      {props.portraits === undefined ? null : (
        <Portraits portraits={props.portraits} />
      )}
      {props.portraits === undefined ? null : (
        <PhonePortraits portraits={props.portraits} />
      )}
      <span className="relative mx-auto flex w-full flex-col items-center justify-center px-s5 py-s8 text-center @regular:w-[calc(100cqw-2*var(--hero-portrait))] @regular:px-s6 @regular:py-s12">
        {props.tag === undefined ? null : <Tag tag={props.tag} />}
        <span data-slot="hero-headline" className={cn("text-ink", statement)}>
          {props.headline}
        </span>
        <span className="mt-s4 text-body text-ink-muted">{props.lead}</span>
        <span
          data-slot="hero-action"
          className={cn(buttonVariants({ tone: "primary" }), "mt-s6")}
        >
          {props.action}
        </span>
      </span>
    </a>
  )
}

type FanPicture = {
  id: string
  src: string
}

const tilts = ["-rotate-12", "-rotate-4", "rotate-4", "rotate-12"] as const

function HeroFan({
  pictures,
  headline,
  model,
  line,
}: {
  pictures: ReadonlyArray<FanPicture>
  headline: string
  model: string
  line: string
}): ReactElement {
  return (
    <div
      data-slot="hero-fan"
      className="flex flex-col items-center gap-6 text-center"
    >
      <div aria-hidden="true" className="flex items-end justify-center">
        {pictures.slice(0, tilts.length).map((picture, index) => (
          <img
            key={picture.id}
            src={picture.src}
            alt=""
            className={cn(
              "-mx-2 aspect-3/4 w-22 rounded-cell bg-(--well) object-cover @regular:-mx-3 @regular:w-35",
              tilts[index]
            )}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="flex flex-col text-display text-ink">
          <span>{headline}</span>
          <span className="text-ink-muted">{model}</span>
        </h2>
        <p className="text-body text-ink-muted">{line}</p>
      </div>
    </div>
  )
}

export type {
  FanPicture,
  HeroBannerProps,
  HeroPortrait,
  HeroPortraits,
  HeroTag,
}
export { HeroBanner, HeroFan }
