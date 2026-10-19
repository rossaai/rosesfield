import { cn } from "@rosesfield/ui/lib/cn"
import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps, ReactElement } from "react"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-s1 rounded-full px-s3 py-s1 font-medium text-caption whitespace-nowrap",
  {
    variants: {
      tone: {
        info: "bg-hor-tint text-hor-text",
        warning: "bg-cem-tint text-cem-text",
        danger: "bg-bug-tint text-bug-text",
        neutral: "bg-surface-2 font-normal text-ink-muted",
      },
    },
    defaultVariants: { tone: "info" },
  }
)

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>

function Badge({ className, tone, ...props }: BadgeProps): ReactElement {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
