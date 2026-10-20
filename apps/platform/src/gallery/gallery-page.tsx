import { Toaster, ToastProvider } from "@rosesfield/ui/components/toast"
import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { type ReactElement, useEffect } from "react"
import { t } from "@/gallery/copy.en"
import { catalogEntries } from "@/gallery/entries/catalog"
import { controlEntries } from "@/gallery/entries/controls"
import { displayEntries } from "@/gallery/entries/display"
import { fieldEntries } from "@/gallery/entries/fields"
import { layerEntries } from "@/gallery/entries/layers"
import { materialEntry } from "@/gallery/entries/materials"
import { mediaEntries } from "@/gallery/entries/media"
import { pieceEntries } from "@/gallery/entries/pieces"
import { platformEntries } from "@/gallery/entries/platform"
import { screenStateEntries } from "@/gallery/entries/screen-states"
import { shellEntries } from "@/gallery/entries/shell"
import type { GalleryEntry, GalleryState } from "@/gallery/gallery-entry"
import { type Scheme, SchemePair, schemes } from "@/gallery/scheme-pair"
import { screenEntries } from "@/gallery/screens/screen-entries"
import { effectTilesEntry } from "@/studio/effects/effect-tiles-gallery"

export const galleryEntries: GalleryEntry[] = [
  ...controlEntries,
  ...fieldEntries,
  ...displayEntries,
  materialEntry,
  ...pieceEntries,
  ...mediaEntries,
  ...catalogEntries,
  effectTilesEntry,
  ...shellEntries,
  ...layerEntries,
  ...platformEntries,
  ...screenStateEntries,
  ...screenEntries,
]

export type GallerySearch = {
  entry?: string
  state?: string
  scheme?: Scheme
}

export function readGallerySearch(search: string): GallerySearch {
  const params = new URLSearchParams(search)
  const scheme = params.get("scheme")
  return {
    ...(params.has("entry") ? { entry: params.get("entry") ?? "" } : {}),
    ...(params.has("state") ? { state: params.get("state") ?? "" } : {}),
    ...(scheme === "light" || scheme === "dark" ? { scheme } : {}),
  }
}

function focusHref(
  entry: GalleryEntry,
  state: GalleryState,
  scheme?: Scheme
): string {
  const params = new URLSearchParams({
    entry: entry.id,
    state: state.id,
    ...(scheme === undefined ? {} : { scheme }),
  })
  return `?${params.toString()}`
}

function StateFrame({
  entry,
  state,
}: {
  entry: GalleryEntry
  state: GalleryState
}): ReactElement {
  return (
    <div className="flex flex-col gap-s2">
      <iframe
        title={`${t(entry.title)}: ${t(state.label)}`}
        src={focusHref(entry, state)}
        loading="lazy"
        className="h-dvh w-full rounded-card bg-canvas"
      />
      <LayerLinks entry={entry} state={state} />
    </div>
  )
}

function LayerLinks({
  entry,
  state,
}: {
  entry: GalleryEntry
  state: GalleryState
}): ReactElement {
  return (
    <p className="flex flex-wrap items-center gap-s3 text-body text-ink-muted">
      {state.placement === "screen"
        ? t("gallery.screenNote")
        : t("gallery.layerNote")}
      {schemes.map(({ scheme, label }) => (
        <a
          key={scheme}
          href={focusHref(entry, state, scheme)}
          className="font-medium text-ink hover:underline"
        >
          {t(label)}
        </a>
      ))}
    </p>
  )
}

function EntrySection({ entry }: { entry: GalleryEntry }): ReactElement {
  return (
    <section id={entry.id} className="flex flex-col gap-s4">
      <h2 className="text-title">{t(entry.title)}</h2>
      {entry.states.map((state) => (
        <div key={state.id} className="flex flex-col gap-s2">
          <h3 className="text-label text-ink-muted">{t(state.label)}</h3>
          {state.placement === "layer" || state.placement === "screen" ? (
            <StateFrame entry={entry} state={state} />
          ) : (
            <SchemePair width={state.width ?? "pair"}>
              {state.render}
            </SchemePair>
          )}
        </div>
      ))}
    </section>
  )
}

function GalleryIndex(): ReactElement {
  return (
    <div className="@container mx-auto flex w-full max-w-[calc(2*var(--container-regular))] flex-col gap-s12 px-s5 py-s12 @regular:px-s6">
      <header className="flex flex-col gap-s2">
        <h1 className="text-display">{t("gallery.title")}</h1>
        <p className="max-w-prose-max text-body text-ink-muted">
          {t("gallery.body")}
        </p>
      </header>
      {galleryEntries.map((entry) => (
        <EntrySection key={entry.id} entry={entry} />
      ))}
    </div>
  )
}

function useRootScheme(scheme: Scheme | undefined): void {
  useEffect(() => {
    if (scheme === undefined) {
      return
    }
    const root = document.documentElement
    const previous = root.dataset.theme
    root.dataset.theme = scheme
    return () => {
      if (previous === undefined) {
        delete root.dataset.theme
      } else {
        root.dataset.theme = previous
      }
    }
  }, [scheme])
}

function GalleryFocus({ search }: { search: GallerySearch }): ReactElement {
  useRootScheme(search.scheme)
  const entry = galleryEntries.find(
    (candidate) => candidate.id === search.entry
  )
  const state = entry?.states.find((candidate) => candidate.id === search.state)
  if (state?.placement === "screen") {
    return <div className="bg-canvas text-ink">{state.render()}</div>
  }
  return (
    <div className="flex min-h-dvh flex-col gap-s6 bg-canvas p-s6 text-ink">
      <a href="?" className="text-body font-medium text-ink hover:underline">
        {t("gallery.back")}
      </a>
      {entry === undefined || state === undefined ? (
        <p className="text-body">{t("gallery.missing")}</p>
      ) : (
        <div className="flex flex-col gap-s4">
          <h1 className="text-title">{t(entry.title)}</h1>
          <div className="flex flex-wrap items-start gap-s4">
            {state.render()}
          </div>
        </div>
      )}
    </div>
  )
}

export function GalleryPage(search: GallerySearch): ReactElement {
  return (
    <ToastProvider>
      <TooltipProvider>
        {search.entry === undefined ? (
          <GalleryIndex />
        ) : (
          <GalleryFocus search={search} />
        )}
        <Toaster />
      </TooltipProvider>
    </ToastProvider>
  )
}
