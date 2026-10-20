import { interaction } from "@rosesfield/ui/components/interaction"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"

type HeroBannerProps = {
  href: string
  kicker: string
  headline: string
  lead: string
  action: string
  art?: ReactNode
}

function HeroBanner(props: HeroBannerProps): ReactElement {
  return (
    <a
      data-slot="hero"
      href={props.href}
      className={cn(
        "group/hero relative mt-6 hidden h-100 w-full overflow-hidden rounded-vessel bg-surface @regular:flex",
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
      <span
        aria-hidden="true"
        data-slot="hero-glow-ellipse"
        className="absolute top-2 left-1/2 h-67.5 w-184 -translate-x-1/2 rounded-full bg-surface opacity-80 blur-3xl"
      />
      <span className="relative mx-auto flex w-146 flex-col items-center justify-center py-8 text-center">
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

export type { FanPicture, HeroBannerProps }
export { HeroBanner, HeroFan }
