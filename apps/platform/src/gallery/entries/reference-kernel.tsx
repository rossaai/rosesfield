import { IconButton } from "@rosesfield/ui/components/button"
import {
  Composer,
  ComposerChips,
  ComposerToolbar,
} from "@rosesfield/ui/components/composer"
import { ConfirmButton } from "@rosesfield/ui/components/confirm-button"
import { InlineChip } from "@rosesfield/ui/components/inline-chip"
import {
  SkeletonCard,
  SkeletonMasonry,
  SkeletonRow,
} from "@rosesfield/ui/components/skeleton"
import { ViewMenu } from "@rosesfield/ui/components/view-menu"
import {
  ArrowUpRightIcon,
  AtSignIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { type ReactElement, type ReactNode, useEffect, useRef } from "react"
import { t } from "@/gallery/copy.en"
import demoWide from "@/gallery/fixtures/demo-image-16-9.png"
import type { GalleryState } from "@/gallery/gallery-entry"
import { frameState } from "@/gallery/reference-frames"

function PressedOnMount({ children }: { children: ReactNode }): ReactElement {
  const box = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    box.current?.querySelector("button")?.click()
  }, [])
  return (
    <span ref={box} className="contents">
      {children}
    </span>
  )
}

function Confirm(): ReactElement {
  return (
    <span data-density="chrome" className="flex">
      <ConfirmButton
        icon={<Trash2Icon />}
        label={t("sample.delete")}
        onConfirm={() => undefined}
      />
    </span>
  )
}

function View(): ReactElement {
  return (
    <div className="flex h-110 w-full items-start justify-end">
      <ViewMenu
        label={t("sample.view")}
        layoutLabel={t("sample.layout")}
        listLabel={t("sample.view.list")}
        gridLabel={t("sample.view.grid")}
        layout="grid"
        onLayoutChange={() => undefined}
        size={{
          label: t("sample.size"),
          value: 1,
          min: 0,
          max: 2,
          onValueChange: () => undefined,
        }}
        filterLabel={t("sample.filter")}
        facets={[
          {
            id: "date",
            label: t("sample.date"),
            value: "any",
            options: [
              { value: "any", label: t("sample.anyTime") },
              { value: "today", label: t("sample.today") },
            ],
            onValueChange: () => undefined,
          },
        ]}
      />
    </div>
  )
}

function Skeletons(): ReactElement {
  return (
    <div className="flex w-full flex-col gap-s6">
      <SkeletonMasonry columns={4} />
      <SkeletonRow />
      <div className="w-48">
        <SkeletonCard aspect={{ width: 3, height: 4 }} />
      </div>
    </div>
  )
}

function Chips(): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-s3">
      <InlineChip href="?entry=ref-inline-chip">{t("sample.link")}</InlineChip>
      <InlineChip href="?entry=ref-inline-chip" lead={<ArrowUpRightIcon />}>
        {t("sample.link")}
      </InlineChip>
    </div>
  )
}

function ComposerDemo(): ReactElement {
  return (
    <div className="w-full max-w-180">
      <Composer floating={true}>
        <textarea
          aria-label={t("sample.prompt.label")}
          placeholder={t("sample.prompt.placeholder")}
          className="min-h-s12 w-full resize-none bg-transparent text-body outline-none"
        />
        <ComposerToolbar>
          <IconButton label={t("sample.references")} tone="quiet">
            <PlusIcon aria-hidden="true" />
          </IconButton>
          <IconButton label={t("sample.elements")} tone="quiet">
            <AtSignIcon aria-hidden="true" />
          </IconButton>
          <ComposerChips>
            <span className="text-body text-ink-muted">
              {t("sample.model")}
            </span>
          </ComposerChips>
        </ComposerToolbar>
      </Composer>
    </div>
  )
}

function OverPhoto({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="relative w-full overflow-hidden rounded-vessel p-s6">
      <img
        src={demoWide}
        alt=""
        className="absolute inset-0 size-full object-cover"
      />
      <div className="relative">{children}</div>
    </div>
  )
}

export function overPhoto(picker: ReactElement): ReactElement {
  return <OverPhoto>{picker}</OverPhoto>
}

export const confirmStates: GalleryState[] = [
  frameState("confirm", "ref.confirmButton", () => <Confirm />),
  frameState("confirm-armed", "state.armed", () => (
    <PressedOnMount>
      <Confirm />
    </PressedOnMount>
  )),
]

export const viewStates: GalleryState[] = [
  frameState("view", "ref.viewMenu", () => <View />),
  frameState("view-open", "state.open", () => (
    <PressedOnMount>
      <View />
    </PressedOnMount>
  )),
]

export const composerState: GalleryState = frameState(
  "composer",
  "ref.composer",
  () => <ComposerDemo />
)

export const skeletonState: GalleryState = frameState(
  "skeletons",
  "entry.skeleton",
  () => <Skeletons />
)

export const inlineChipState: GalleryState = frameState(
  "inline-chip",
  "ref.inlineChip",
  () => <Chips />
)
