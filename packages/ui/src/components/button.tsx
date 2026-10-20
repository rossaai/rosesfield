import { Button as ButtonPrimitive } from "@base-ui/react/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { cva, type VariantProps } from "class-variance-authority"
import type { ReactElement, ReactNode } from "react"

const buttonVariants = cva(
  "group/button relative inline-flex min-w-0 shrink-0 items-center justify-center gap-s1 rounded-full font-medium text-body whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-(--opacity-disabled) data-disabled:pointer-events-none data-disabled:opacity-(--opacity-disabled) [&_svg]:glyph",
  {
    variants: {
      tone: {
        default: "bg-(--well) text-ink",
        primary: "bg-ink text-canvas",
        quiet:
          "bg-transparent text-ink hover:bg-(--tint) aria-expanded:bg-(--tint) data-popup-open:bg-(--tint)",
        danger: "bg-bug-tint text-bug-text",
      },
      size: {
        default: "h-field max-w-button-max px-s4",
        dense: "h-button-dense max-w-button-max px-s4",
        small: "h-button-small max-w-button-max px-s3",
        icon: "size-icon",
        "icon-dense": "size-icon-dense",
        "icon-small": "size-icon-small [&_svg]:glyph-small",
        "icon-badge": "size-remove-badge [&_svg]:glyph-small",
      },
    },
    defaultVariants: {
      tone: "default",
      size: "default",
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
    return <span className="min-w-0 truncate">{children}</span>
  }
  return children
}

function Button({
  className,
  tone,
  size,
  busy = false,
  children,
  onClick,
  ...props
}: ButtonProps): ReactElement {
  const isRound = typeof size === "string" && size.startsWith("icon")
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
        buttonVariants({ tone, size }),
        busy ? "[&>:not([data-spinner])]:opacity-0" : "",
        isRound ? motion.pressRound : motion.press,
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

type IconButtonProps = Omit<ButtonProps, "size" | "aria-label"> & {
  label: string
  shortcut?: ReactNode
  size?: "default" | "dense" | "small" | "badge"
}

const iconSizes: Record<
  NonNullable<IconButtonProps["size"]>,
  "icon" | "icon-dense" | "icon-small" | "icon-badge"
> = {
  default: "icon",
  dense: "icon-dense",
  small: "icon-small",
  badge: "icon-badge",
}

function IconButton({
  label,
  shortcut,
  size = "default",
  tone,
  className,
  ...props
}: IconButtonProps): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={label}
            size={iconSizes[size]}
            tone={tone}
            className={cn(tone === "quiet" ? "bg-(--well)" : "", className)}
            {...props}
          />
        }
      />
      <TooltipContent>
        {label}
        {shortcut}
      </TooltipContent>
    </Tooltip>
  )
}

export type { ButtonProps, IconButtonProps }
export { Button, buttonVariants, IconButton }
