import {
  offeredPresets,
  type PresetKind,
  presetKeyOf,
  type VfxPreset,
} from "@rosesfield/catalog/vfx"
import { interaction } from "@rosesfield/ui/components/interaction"
import { MediaBadge } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { SparklesIcon } from "lucide-react"
import { type ReactElement, useEffect, useRef } from "react"
import { tCatalog } from "@/copy/t"
import { ChosenVeil } from "@/pieces/selectable-tile"

export const guidePath = "/vfx/guides/"

export type PresetMedia =
  | { kind: "guide"; src: string }
  | { kind: "result"; src: string }
  | { kind: "none" }

export function presetMediaOf(preset: VfxPreset): PresetMedia {
  if (preset.result !== null) {
    return { kind: "result", src: `/vfx/results/${preset.result.file}` }
  }
  return preset.kind === "photo"
    ? { kind: "guide", src: `${guidePath}${preset.guide.file}` }
    : { kind: "none" }
}

export function presetNameOf(preset: VfxPreset): string {
  return tCatalog(`vfx.preset.${presetKeyOf(preset.id)}`)
}

export function presetNeedOf(preset: VfxPreset): string {
  return tCatalog(`vfx.needs.${presetKeyOf(preset.id)}`)
}

const tileShape: Readonly<Record<PresetKind, string>> = {
  photo: "aspect-9/16",
  clip: "aspect-16/9",
}

function TileMedia({ preset }: { preset: VfxPreset }): ReactElement {
  const media = presetMediaOf(preset)
  const name = presetNameOf(preset)
  if (media.kind === "none") {
    return (
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-s2 text-ink-muted [&_svg]:glyph">
        <SparklesIcon aria-hidden="true" />
        <span className="text-label">{tCatalog("vfx.tile.noRun")}</span>
      </span>
    )
  }
  return (
    <>
      <video
        src={media.src}
        aria-label={
          media.kind === "guide"
            ? tCatalog("vfx.tile.guideAlt", { preset: name })
            : name
        }
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        className={cn(
          "absolute inset-0 size-full",
          media.kind === "guide" ? "bg-black object-contain" : "object-cover"
        )}
      />
      {media.kind === "guide" ? (
        <span
          data-slot="preset-guide"
          className="absolute start-s1_5 top-s1_5 flex"
        >
          <MediaBadge>{tCatalog("vfx.tile.guide")}</MediaBadge>
        </span>
      ) : null}
    </>
  )
}

type TileProps = {
  preset: VfxPreset
  isChosen: boolean
  onChoose: () => void
  chosenRef: (element: HTMLButtonElement | null) => void
}

function Tile({ preset, isChosen, onChoose, chosenRef }: TileProps) {
  return (
    <button
      type="button"
      aria-pressed={isChosen}
      ref={isChosen ? chosenRef : undefined}
      onClick={onChoose}
      data-preset={preset.id}
      className={cn(
        "group/tile flex w-full min-w-0 flex-col gap-s2 rounded-card text-left",
        interaction.ring
      )}
    >
      <span
        data-slot="preset-media"
        className={cn(
          "relative w-full overflow-hidden rounded-cell bg-(--well)",
          tileShape[preset.kind]
        )}
      >
        <TileMedia preset={preset} />
        <ChosenVeil isChosen={isChosen} />
      </span>
      <span
        className={cn(
          "truncate px-s1 text-body",
          isChosen ? "font-medium text-ink" : "text-ink-muted"
        )}
      >
        {presetNameOf(preset)}
      </span>
    </button>
  )
}

type PresetTilesProps = {
  value: string
  onChange: (preset: string) => void
  register: (focus: () => void) => void
  presets?: readonly VfxPreset[]
}

const kinds: readonly PresetKind[] = ["photo", "clip"]

export function PresetTiles(props: PresetTilesProps): ReactElement {
  const chosen = useRef<HTMLButtonElement | null>(null)
  const { register } = props
  useEffect(() => {
    register(() => chosen.current?.focus())
  }, [register])
  const presets = props.presets ?? offeredPresets
  const setChosen = (element: HTMLButtonElement | null): void => {
    chosen.current = element
  }
  return (
    <div className="flex flex-col gap-s5">
      {kinds.map((kind) => {
        const inKind = presets.filter((preset) => preset.kind === kind)
        if (inKind.length === 0) {
          return null
        }
        const label = tCatalog(`vfx.kind.${kind}`)
        return (
          <section key={kind} className="flex flex-col gap-s3">
            <div className="flex flex-col gap-s1">
              <h2 className="text-body text-ink">{label}</h2>
              <p className="text-label text-ink-muted">
                {tCatalog(`vfx.kind.${kind}.line`)}
              </p>
            </div>
            <ul
              aria-label={label}
              className="grid grid-cols-2 items-start gap-s3"
            >
              {inKind.map((preset) => (
                <li key={preset.id} className="flex min-w-0">
                  <Tile
                    preset={preset}
                    isChosen={preset.id === props.value}
                    onChoose={() => props.onChange(preset.id)}
                    chosenRef={setChosen}
                  />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
