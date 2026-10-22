import { cn } from "@rosesfield/ui/lib/cn"
import type { ReactElement } from "react"
import { t } from "@/copy/t"

const lockups = {
  light: "/lockup-light.svg",
  dark: "/lockup-dark.svg",
}

const hills = {
  light: "/icons/rosesfield-hill-light.svg",
  dark: "/icons/rosesfield-hill-dark.svg",
}

function SchemePair({
  sources,
  className,
  label,
}: {
  sources: { light: string; dark: string }
  className: string
  label: string
}): ReactElement {
  return (
    <>
      <img
        src={sources.light}
        alt={label}
        className={cn("block w-auto dark:hidden", className)}
      />
      <img
        src={sources.dark}
        alt={label}
        className={cn("hidden w-auto dark:block", className)}
      />
    </>
  )
}

export function Lockup({ className }: { className?: string }): ReactElement {
  return (
    <SchemePair
      sources={lockups}
      label={t("shell.name")}
      className={cn("h-icon", className)}
    />
  )
}

export function FieldMark({ className }: { className?: string }): ReactElement {
  return (
    <SchemePair
      sources={hills}
      label=""
      className={cn("aspect-3/2 h-6", className)}
    />
  )
}
