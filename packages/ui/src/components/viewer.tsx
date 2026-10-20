import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { IconButton } from "@rosesfield/ui/components/button"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { useGrowFrom } from "@rosesfield/ui/hooks/use-grow-from"
import { cn } from "@rosesfield/ui/lib/cn"
import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react"
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefCallback,
  useEffect,
  useRef,
} from "react"

type ViewerStep = {
  label: string
  onSelect: () => void
}

type ViewerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  origin: HTMLElement | null
  aspect: MediaAspect
  title: string
  closeLabel: string
  children: ReactNode
  aside?: ReactNode
  bar?: ReactNode
  previous?: ViewerStep
  next?: ViewerStep
}

function StepButton({
  step,
  side,
}: {
  step: ViewerStep | undefined
  side: "left" | "right"
}): ReactNode {
  if (step === undefined) {
    return null
  }
  return (
    <IconButton
      label={step.label}
      onClick={step.onSelect}
      className={cn(
        "absolute top-1/2 -translate-y-1/2",
        side === "left" ? "left-6" : "right-6"
      )}
    >
      {side === "left" ? (
        <ChevronLeftIcon aria-hidden="true" />
      ) : (
        <ChevronRightIcon aria-hidden="true" />
      )}
    </IconButton>
  )
}

function useStepKeys(
  previous: ViewerStep | undefined,
  next: ViewerStep | undefined
): (event: KeyboardEvent<HTMLElement>) => void {
  return (event) => {
    if (event.key === "ArrowLeft") {
      previous?.onSelect()
    } else if (event.key === "ArrowRight") {
      next?.onSelect()
    }
  }
}

type ViewerStageProps = Pick<
  ViewerProps,
  "aspect" | "children" | "previous" | "next"
> & {
  frameRef: RefCallback<HTMLElement>
  fadeRef: RefCallback<HTMLElement>
  onClose: () => void
}

function ViewerStage(props: ViewerStageProps): ReactElement {
  const { width, height } = props.aspect
  return (
    <div
      data-slot="media-player-picture"
      className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center px-4 py-s12 @regular:p-4"
      style={{ containerType: "size" }}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={props.onClose}
        className="absolute inset-0 cursor-default"
      />
      <div
        ref={props.frameRef}
        data-slot="viewer-frame"
        className="relative origin-top-left overflow-hidden @regular:rounded-cell"
        style={{
          aspectRatio: `${width} / ${height}`,
          width: `min(100cqw, 100cqh * ${width} / ${height})`,
        }}
      >
        {props.children}
      </div>
      <div
        ref={props.fadeRef}
        className="pointer-events-none absolute inset-0 *:pointer-events-auto"
      >
        <StepButton step={props.previous} side="left" />
        <StepButton step={props.next} side="right" />
      </div>
    </div>
  )
}

function ViewerAside({
  fadeRef,
  children,
  hasBar,
}: {
  fadeRef: RefCallback<HTMLElement>
  children: ReactNode
  hasBar: boolean
}): ReactNode {
  if (children === undefined) {
    return null
  }
  return (
    <aside
      ref={fadeRef}
      data-ground="layer"
      className={cn(
        "max-h-[50dvh] w-full shrink-0 flex-col gap-s4 overflow-y-auto bg-layer p-s6 text-ink @regular:my-2 @regular:me-2 @regular:flex @regular:max-h-none @regular:w-88 @regular:rounded-card @regular:p-2.5",
        hasBar ? "hidden" : "flex"
      )}
    >
      {children}
    </aside>
  )
}

function ViewerBar({
  fadeRef,
  children,
}: {
  fadeRef: RefCallback<HTMLElement>
  children: ReactNode
}): ReactNode {
  if (children === undefined) {
    return null
  }
  return (
    <div
      ref={fadeRef}
      data-slot="viewer-bar"
      data-ground="layer"
      className="flex shrink-0 items-center gap-s2 px-s5 pt-s3 pb-s5 @regular:hidden"
    >
      {children}
    </div>
  )
}

function ViewerClose({
  fadeRef,
  label,
  onClose,
}: {
  fadeRef: RefCallback<HTMLElement>
  label: string
  onClose: () => void
}): ReactElement {
  return (
    <span ref={fadeRef} className="absolute top-6 right-5">
      <IconButton label={label} place="cardWide" onClick={onClose}>
        <XIcon aria-hidden="true" />
      </IconButton>
    </span>
  )
}

function Viewer(props: ViewerProps): ReactElement {
  const origin = useRef<HTMLElement | null>(props.origin)
  const popup = useRef<HTMLDivElement>(null)
  useEffect(() => {
    origin.current = props.origin
  }, [props.origin])
  const { isMounted, frameRef, fadeRef } = useGrowFrom(props.open, origin)
  const onKeyDown = useStepKeys(props.previous, props.next)
  const close = (): void => props.onOpenChange(false)
  const onOpenChange = (next: boolean): void => {
    if (!next) {
      close()
    }
  }
  return (
    <DialogPrimitive.Root open={isMounted} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Popup
          ref={popup}
          aria-label={props.title}
          initialFocus={popup}
          finalFocus={origin}
          onKeyDown={onKeyDown}
          className="@container fixed inset-0 z-50 outline-none"
        >
          <div
            ref={fadeRef}
            aria-hidden="true"
            data-slot="viewer-cover"
            className="absolute inset-0 bg-layer @regular:bg-surface"
          />
          <div className="relative flex size-full flex-col @regular:flex-row">
            <ViewerStage
              {...props}
              frameRef={frameRef}
              fadeRef={fadeRef}
              onClose={close}
            />
            <ViewerAside fadeRef={fadeRef} hasBar={props.bar !== undefined}>
              {props.aside}
            </ViewerAside>
            <ViewerBar fadeRef={fadeRef}>{props.bar}</ViewerBar>
          </div>
          <ViewerClose
            fadeRef={fadeRef}
            label={props.closeLabel}
            onClose={close}
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

export type { ViewerProps, ViewerStep }
export { Viewer }
