import { Button as ButtonPrimitive } from "@base-ui/react/button"
import type { ButtonTone } from "@rosesfield/ui/contracts/button.generated"
import type { IconButtonTone } from "@rosesfield/ui/contracts/icon-button.generated"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { cn } from "@rosesfield/ui/lib/cn"
import { cva, type VariantProps } from "class-variance-authority"
import type { ReactElement, ReactNode } from "react"

const tones = {
  default: "bg-(--well) text-ink",
  surface: "bg-(--well) text-ink",
  primary: "bg-ink text-canvas",
  accent: "bg-ink text-canvas",
  quiet: "bg-transparent text-ink aria-expanded:bg-(--tint) data-popup-open:bg-(--tint)",
  muted: "bg-transparent text-ink-muted",
  canvas: "bg-canvas text-ink",
  danger: "bg-bug-tint text-bug-text",
  glass: "material-thin text-ink",
} satisfies Record<ButtonTone | IconButtonTone | "default" | "primary", string>

const buttonVariants = cva(
  cn(
    "group/button relative inline-flex min-w-0 shrink-0 items-center justify-center gap-s1 rounded-full font-medium text-body whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-(--opacity-disabled) data-disabled:pointer-events-none data-disabled:opacity-(--opacity-disabled) [&_svg]:glyph",
    interaction.light,
    interaction.ring
  ),
  {
    variants: {
      tone: tones,
      size: {
        default: "h-field max-w-button-max px-s4",
        dense: "h-button-dense max-w-button-max px-s4",
        small: "h-button-small max-w-button-max px-s3",
        hero: "h-12 gap-1.5 p-4",
        bar: "h-9 px-3",
        barCompact: "h-6 px-2.5",
        recreate: "h-8 gap-1.5 px-3 py-1.5 [&_svg]:size-4",
        recreateSmall: "h-7 gap-1.5 px-2 [&_svg]:size-4",
        icon: "size-icon",
        "icon-dense": "size-icon-dense",
        "icon-small": "size-icon-small [&_svg]:glyph-small",
        "icon-badge": "size-remove-badge [&_svg]:glyph-small",
        "icon-barCompact": "size-6 [&_svg]:size-4",
        "icon-bar": "size-9 [&_svg]:size-4",
        "icon-close": "size-9.5 [&_svg]:size-6",
        "icon-card": "size-7 [&_svg]:size-4",
        "icon-cardWide": "size-8 [&_svg]:size-4",
        "icon-clip": "size-10 [&_svg]:size-4",
        "icon-carousel": "size-15 [&_svg]:size-9",
      },
      width: {
        content: "",
        full: "w-full max-w-none",
      },
    },
    defaultVariants: {
      tone: "default",
      size: "default",
      width: "content",
    },
  }
)

type ButtonVariants = VariantProps<typeof buttonVariants>

type ButtonProps = ButtonPrimitive.Props &
  ButtonVariants & {
    busy?: boolean
  }

function Spinner(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      data-spinner=""
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      className="glyph absolute inset-0 m-auto motion-safe:animate-spin"
    >
      <path d="M8 2a6 6 0 1 0 6 6" />
    </svg>
  )
}

function Label({ children }: { children: ReactNode }): ReactNode {
  if (typeof children === "string") {
    return (
      <span data-slot="button-label" className="min-w-0 truncate">
        {children}
      </span>
    )
  }
  return children
}

function Button({
  className,
  tone,
  size,
  width,
  busy = false,
  children,
  onClick,
  ...props
}: ButtonProps): ReactElement {
  const guardedClick: NonNullable<ButtonProps["onClick"]> = (event) => {
    if (busy) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }
  return (
    <ButtonPrimitive
      data-slot="button"
      aria-busy={busy || undefined}
      className={cn(
        buttonVariants({ tone, size, width }),
        busy ? "[&>:not([data-spinner])]:opacity-0" : "",
        className
      )}
      onClick={guardedClick}
      {...props}
    >
      {busy ? <Spinner /> : null}
      <Label>{children}</Label>
    </ButtonPrimitive>
  )
}

type IconPlace =
  | "barCompact"
  | "bar"
  | "close"
  | "card"
  | "cardWide"
  | "clip"
  | "carousel"

type IconButtonProps = Omit<ButtonProps, "size" | "aria-label"> & {
  label: string
  shortcut?: ReactNode
  size?: "default" | "dense" | "small" | "badge"
  place?: IconPlace
}

const iconSizes = {
  default: "icon",
  dense: "icon-dense",
  small: "icon-small",
  badge: "icon-badge",
} as const satisfies Record<
  NonNullable<IconButtonProps["size"]>,
  NonNullable<ButtonVariants["size"]>
>

const placeSizes = {
  barCompact: "icon-barCompact",
  bar: "icon-bar",
  close: "icon-close",
  card: "icon-card",
  cardWide: "icon-cardWide",
  clip: "icon-clip",
  carousel: "icon-carousel",
} as const satisfies Record<IconPlace, NonNullable<ButtonVariants["size"]>>

function IconButton({
  label,
  shortcut,
  size = "default",
  place,
  tone,
  className,
  children,
  ...props
}: IconButtonProps): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            data-place={place}
            size={place === undefined ? iconSizes[size] : placeSizes[place]}
            tone={tone}
            className={cn(tone === "quiet" ? "bg-(--well)" : "", className)}
            {...props}
          >
            <span data-slot="icon-button-glyph" className="contents">
              {children}
            </span>
          </Button>
        }
      />
      <TooltipContent data-slot="icon-button-tip">
        {label}
        {shortcut}
      </TooltipContent>
    </Tooltip>
  )
}

export type { ButtonProps, IconButtonProps, IconPlace }
export { Button, buttonVariants, IconButton }
