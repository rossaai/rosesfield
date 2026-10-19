import { cn } from "@rosesfield/ui/lib/cn"
import type { ComponentProps, ReactElement } from "react"

type CardProps = ComponentProps<"div"> & {
  ground?: "surface" | "canvas"
}

function Card({
  className,
  ground = "surface",
  ...props
}: CardProps): ReactElement {
  return (
    <div
      data-slot="card"
      data-ground={ground}
      className={cn(
        "flex flex-col gap-s2_5 rounded-card bg-(--ground) p-s6 text-ink",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-s1", className)}
      {...props}
    />
  )
}

function CardTitle({
  className,
  ...props
}: ComponentProps<"h3">): ReactElement {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-body font-medium", className)}
      {...props}
    />
  )
}

function CardDescription({
  className,
  ...props
}: ComponentProps<"p">): ReactElement {
  return (
    <p
      data-slot="card-description"
      className={cn("text-body text-ink-muted", className)}
      {...props}
    />
  )
}

function CardContent({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return <div data-slot="card-content" className={className} {...props} />
}

function CardFooter({
  className,
  ...props
}: ComponentProps<"div">): ReactElement {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-s2", className)}
      {...props}
    />
  )
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
