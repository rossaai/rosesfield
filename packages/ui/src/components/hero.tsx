import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"

type HeroTag = {
  label: string
  icon: ReactNode
}

type HeroPortraits = {
  start?: string
  end?: string
}

type HeroBannerProps = {
  href: string
  kicker: string
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
    const src = portraits[side]
    return src === undefined
      ? []
      : [
          <img
            key={side}
            src={src}
            alt=""
            data-slot="hero-portrait"
            data-side={side}
            className={cn(
              "absolute bottom-0 h-full w-[min(--spacing(75),calc((100cqw_-_var(--spacing)*146)/2))] object-cover",
              portraitSides[side]
            )}
          />,
        ]
  })
}

function Tag({ tag }: { tag: HeroTag }): ReactElement {
  return (
    <span
      data-slot="hero-tag"
      className="mb-8 inline-flex h-7 items-center gap-1 rounded-full bg-hor-tint ps-1.5 pe-2 font-medium text-body text-hor-text [&_svg]:size-4"
    >
      <span aria-hidden="true" className="flex">
        {tag.icon}
      </span>
      {tag.label}
    </span>
  )
}

function HeroBanner(props: HeroBannerProps): ReactElement {
  return (
    <a
      data-slot="hero"
      href={props.href}
      className={cn(
        "group/hero @container/hero relative mt-6 hidden h-100 w-full overflow-hidden rounded-vessel bg-surface @regular:flex",
        interaction.ring
      )}
    >
      <span
        aria-hidden="true"
        data-slot="hero-glow"
        className="absolute inset-0 bg-radial-[at_50%_100%] from-hor-tint to-transparent"
      />
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
      <span
        aria-hidden="true"
        data-slot="hero-glow-ellipse"
        className="absolute top-2 left-1/2 h-67.5 w-184 -translate-x-1/2 rounded-full bg-surface opacity-80 blur-3xl"
      />
      <span className="relative mx-auto flex w-146 flex-col items-center justify-center py-8 text-center">
        {props.tag === undefined ? null : <Tag tag={props.tag} />}
        <span className="font-medium text-title text-ink">{props.kicker}</span>
        <span className="mt-1 max-w-140 text-display text-balance text-ink">
          {props.headline}
        </span>
        <span className="mt-1 text-body text-ink-muted">{props.lead}</span>
        <span
          data-slot="hero-action"
          className={cn(
            "relative mt-6 inline-flex h-10 items-center rounded-full bg-ink px-4.5 pt-2 pb-2.5 font-medium text-body text-canvas",
            interaction.lightPress,
            "group-hover/hero:after:opacity-10 group-active/hero:after:opacity-20"
          )}
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

export type { FanPicture, HeroBannerProps, HeroPortraits, HeroTag }
export { HeroBanner, HeroFan }
