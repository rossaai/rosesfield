import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { interaction } from "@rosesfield/ui/components/interaction"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@rosesfield/ui/components/tooltip"
import type { ButtonTone } from "@rosesfield/ui/contracts/button.generated"
import type { IconButtonTone } from "@rosesfield/ui/contracts/icon-button.generated"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { cva, type VariantProps } from "class-variance-authority"
import { Children, type ReactElement, type ReactNode } from "react"

const quiet = cn(
  "bg-transparent aria-expanded:bg-(--tint) aria-pressed:bg-(--tint) data-popup-open:bg-(--tint)",
  interaction.fill
)

const tones = {
  default: "bg-(--well) text-ink",
  surface: "bg-(--well) text-ink",
  primary: "bg-ink text-canvas",
  accent: "bg-ink text-canvas",
  quiet: cn(quiet, "text-ink"),
  muted: cn(quiet, "text-ink-muted"),
  canvas: "bg-canvas text-ink",
  danger: "bg-bug-tint text-bug-text",
  glass: "material-thin border border-surface-2 text-ink shadow-float",
} satisfies Record<ButtonTone | IconButtonTone | "default" | "primary", string>

const capsule = "max-w-button-max"

const circle = cn("px-0", motion.pressRound)

const buttonVariants = cva(
  cn(
    "group/button relative inline-flex min-w-0 shrink-0 items-center justify-center gap-s1 rounded-full font-medium text-body whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-(--opacity-disabled) data-disabled:pointer-events-none data-disabled:opacity-(--opacity-disabled) [&_svg]:glyph",
    motion.press,
    interaction.ring
  ),
  {
    variants: {
      tone: tones,
      size: {
        default: cn(
          capsule,
          "h-field px-s5 in-data-[density=composer]:h-button-dense in-data-[density=composer]:px-s4 in-data-[density=row]:h-button-small in-data-[density=row]:px-s4"
        ),
        dense: cn(capsule, "h-button-dense px-s4"),
        small: cn(capsule, "h-button-small px-s4"),
        icon: cn(
          circle,
          "size-icon in-data-[density=composer]:size-icon-dense in-data-[density=row]:size-icon-small in-data-[density=row]:[&_svg]:glyph-small"
        ),
        "icon-dense": cn(circle, "size-icon-dense"),
        "icon-small": cn(circle, "size-icon-small [&_svg]:glyph-small"),
        "icon-badge": cn(circle, "size-remove-badge [&_svg]:glyph-small"),
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
  return Children.map(children, (child) =>
    typeof child === "string" ? (
      <span data-slot="button-label" className="min-w-0 truncate">
        {child}
      </span>
    ) : (
      child
    )
  )
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

type IconButtonProps = Omit<ButtonProps, "size" | "aria-label"> & {
  label: string
  shortcut?: ReactNode
  size?: "default" | "dense" | "small" | "badge"
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

function IconButton({
  label,
  shortcut,
  size = "default",
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
            size={iconSizes[size]}
            tone={tone}
            className={className}
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

export type { ButtonProps, IconButtonProps }
export { Button, buttonVariants, IconButton }
