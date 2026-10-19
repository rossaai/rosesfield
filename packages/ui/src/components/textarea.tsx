import { wellClass } from "@rosesfield/ui/components/input"
import { useAutoGrow } from "@rosesfield/ui/hooks/use-auto-grow"
import { cn } from "@rosesfield/ui/lib/cn"
import { mergeRefs } from "@rosesfield/ui/lib/merge-refs"
import { type ComponentProps, type ReactElement, useRef } from "react"

const growClass =
  "block resize-none field-sizing-content overflow-y-auto py-s3 min-h-field max-h-[calc(6*var(--text-body--line-height)+2*var(--spacing-s3))]"

function Textarea({
  className,
  ref,
  ...props
}: ComponentProps<"textarea">): ReactElement {
  const local = useRef<HTMLTextAreaElement>(null)
  useAutoGrow(local)
  return (
    <textarea
      data-slot="textarea"
      ref={mergeRefs(local, ref)}
      rows={1}
      className={cn(wellClass, growClass, "rounded-field", className)}
      {...props}
    />
  )
}

export { growClass, Textarea }
