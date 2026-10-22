import { Skeleton, SkeletonGroup } from "@rosesfield/ui/components/skeleton"
import { useParams } from "@tanstack/react-router"
import { type ReactElement, type ReactNode, Suspense } from "react"
import {
  useAppToolsLoading,
  useAppToolsScreen,
  useAppToolsSettled,
} from "@/pieces/app-tools"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import type { StageKind } from "@/screens/app/how-it-works"
import { toolOf } from "@/studio/edit/edit-tools"

const barStudios: ReadonlySet<string> = new Set(["image", "ads"])

export function studioKindOf(appId: string): StageKind {
  return barStudios.has(appId) || toolOf(appId) !== null ? "bar" : "column"
}

function CanvasShape(): ReactElement {
  return (
    <div
      data-slot="studio-skeleton-canvas"
      className="flex min-h-0 min-w-0 flex-1 flex-col rounded-card bg-canvas"
    >
      <div className="flex min-h-14 shrink-0 items-start px-4 pt-2 pb-3">
        <div className="flex h-9 items-center gap-1">
          <Skeleton shape="chip" size="control" />
          <Skeleton shape="chip" size="control" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        <Skeleton shape="frame" />
      </div>
    </div>
  )
}

function PanelShape(): ReactElement {
  return (
    <div
      data-slot="studio-skeleton-panel"
      data-ground="surface"
      className="mb-19 flex w-80 shrink-0 flex-col overflow-hidden rounded-card bg-surface"
    >
      <div className="flex shrink-0 items-center gap-3 px-4 pt-3">
        <Skeleton shape="line" measure="phrase" />
        <Skeleton shape="line" measure="word" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
        <div
          data-ground="canvas"
          className="flex h-31.5 flex-col rounded-cell bg-canvas px-3 pt-3"
        >
          <Skeleton shape="line" text="label" measure="word" />
          <Skeleton shape="line" measure="long" />
          <Skeleton shape="line" measure="short" />
        </div>
        <div
          data-ground="canvas"
          className="flex h-12 flex-col justify-center rounded-cell bg-canvas px-3"
        >
          <Skeleton shape="line" text="caption" measure="word" />
          <Skeleton shape="line" text="caption" measure="phrase" />
        </div>
        <div className="flex w-full gap-2">
          <Skeleton className="h-10 flex-1 rounded-dense" />
          <Skeleton className="h-10 flex-1 rounded-dense" />
        </div>
      </div>
      <div className="flex h-15 shrink-0 items-start px-4">
        <Skeleton className="h-field w-full rounded-full" />
      </div>
    </div>
  )
}

function DockShape(): ReactElement {
  return (
    <div
      data-slot="studio-skeleton-dock"
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-220 rounded-vessel bg-surface-2 p-1"
    >
      <div
        data-ground="surface"
        className="flex items-end gap-3 rounded-card bg-surface p-3"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-h-12 flex-col">
            <Skeleton shape="line" measure="long" />
            <Skeleton shape="line" measure="mid" />
          </div>
          <div className="flex h-8 items-center gap-1">
            <Skeleton shape="chip" size="chip" />
            <Skeleton shape="chip" size="chip" />
            <Skeleton shape="chip" size="chip" />
          </div>
        </div>
        <Skeleton className="h-20 w-30 rounded-card" />
      </div>
    </div>
  )
}

const rows = {
  column: "flex min-h-0 flex-1 gap-2 pt-2 @regular:px-4",
  bar: "flex min-h-0 flex-1 pb-4 @regular:pb-0",
} satisfies Record<StageKind, string>

export function StudioShape({ kind }: { kind: StageKind }): ReactElement {
  const isRegular = useIsRegularWindow()
  return (
    <SkeletonGroup
      data-kind={kind}
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <div className={rows[kind]}>
        {isRegular && kind === "column" ? <PanelShape /> : null}
        <CanvasShape />
      </div>
      {isRegular && kind === "bar" ? <DockShape /> : null}
    </SkeletonGroup>
  )
}

function StudioLoading(): ReactElement {
  useAppToolsLoading()
  const { appId } = useParams({ strict: false })
  return <StudioShape kind={studioKindOf(appId ?? "")} />
}

function StudioSettled(): null {
  useAppToolsSettled()
  return null
}

export function StudioSuspense({
  children,
}: {
  children: ReactNode
}): ReactElement {
  useAppToolsScreen()
  return (
    <Suspense fallback={<StudioLoading />}>
      {children}
      <StudioSettled />
    </Suspense>
  )
}
