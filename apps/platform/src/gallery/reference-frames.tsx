import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement, ReactNode } from "react"
import { type GalleryKey, t } from "@/gallery/copy.en"
import type {
  GalleryEntry,
  GalleryForce,
  GalleryState,
} from "@/gallery/gallery-entry"
import { captureName, captureOf } from "@/gallery/reference-capture"

type Width = "desktop" | "phone"

const frames = {
  desktop: "h-225 w-360",
  phone: "h-211 w-97.5",
} satisfies Record<Width, string>

function Capture({
  unit,
  state,
  width,
}: {
  unit: string
  state: string
  width: Width
}): ReactElement {
  const name = captureName(unit, width === "phone" ? `${state}-phone` : state)
  const src = captureOf(unit, width === "phone" ? `${state}-phone` : state)
  if (src === undefined) {
    return (
      <p
        data-slot="reference-capture"
        data-present="no"
        className="flex max-w-97.5 flex-col gap-1 text-body text-ink-muted"
      >
        {t("gallery.reference.missing")}
        <code className="text-code text-ink">{name}</code>
      </p>
    )
  }
  return (
    <img
      data-slot="reference-capture"
      data-present="yes"
      src={src}
      alt={`${t("gallery.reference.alt")} ${name}`}
      className="max-w-full rounded-card"
    />
  )
}

function Frame({
  title,
  src,
  width,
}: {
  title: string
  src: string
  width: Width
}): ReactElement {
  return (
    <iframe
      title={title}
      src={src}
      loading="lazy"
      className={cn(frames[width], "shrink-0 rounded-card bg-canvas")}
    />
  )
}

export function ReferenceFrames({
  entry,
  state,
  src,
}: {
  entry: GalleryEntry
  state: GalleryState
  src: string
}): ReactElement {
  const unit = entry.unit ?? entry.id
  const title = `${t(entry.title)}: ${t(state.label)}`
  return (
    <div className="flex flex-col gap-s4 overflow-x-auto">
      <div data-width="desktop" className="flex flex-col gap-s2">
        <p className="text-caption text-ink-muted">
          {t("gallery.reference.desktop")}
        </p>
        <Frame title={title} src={src} width="desktop" />
        <Capture unit={unit} state={state.id} width="desktop" />
      </div>
      <div data-width="phone" className="flex flex-wrap items-start gap-s4">
        <div className="flex flex-col gap-s2">
          <p className="text-caption text-ink-muted">
            {t("gallery.reference.phone")}
          </p>
          <Frame title={title} src={src} width="phone" />
        </div>
        <Capture unit={unit} state={state.id} width="phone" />
      </div>
    </div>
  )
}

export function frameState(
  id: string,
  label: GalleryKey,
  render: () => ReactNode,
  force?: GalleryForce
): GalleryState {
  return {
    id,
    label,
    placement: "frame",
    ...(force === undefined ? {} : { force }),
    render: () => <div className="px-4 py-6">{render()}</div>,
  }
}

export function interactionStates(
  render: () => ReactNode
): GalleryState[] {
  return [
    frameState("rest", "state.rest", render),
    frameState("hover", "state.hover", render, "hover"),
    frameState("press", "state.press", render, "press"),
    frameState("focus", "state.focus", render, "focus"),
  ]
}
