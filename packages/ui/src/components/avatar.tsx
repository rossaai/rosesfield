import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"

type AvatarProps = AvatarPrimitive.Root.Props & {
  size?: "default" | "small"
}

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarProps): ReactElement {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-(--well) select-none",
        size === "small" ? "size-icon-small" : "size-icon",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: AvatarPrimitive.Image.Props): ReactElement {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("size-full object-cover", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: AvatarPrimitive.Fallback.Props): ReactElement {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center font-medium text-label text-ink",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarFallback, AvatarImage }
