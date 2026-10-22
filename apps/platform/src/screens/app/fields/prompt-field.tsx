import type { InputDefinition } from "@rosesfield/contract"
import { Textarea } from "@rosesfield/ui/components/textarea"
import { cn } from "@rosesfield/ui/lib/cn"
import { type ReactElement, useEffect, useRef } from "react"
import { t } from "@/copy/t"
import { FieldFrame } from "@/screens/app/fields/field-frame"
import { type InputFieldProps, textOf } from "@/screens/app/fields/field-props"
import {
  inputCaption,
  inputPlaceholder,
  isOptionalInput,
} from "@/screens/app/fields/input-copy"

type PromptInput = Extract<InputDefinition, { type: "prompt" }>

const nearShare = 0.9

export function isNearLimitOf(length: number, max: number): boolean {
  return length >= max * nearShare
}

export function PromptField(props: InputFieldProps<PromptInput>): ReactElement {
  const { app, input, register } = props
  const field = useRef<HTMLTextAreaElement>(null)
  const text = textOf(props.value)
  useEffect(() => {
    register(() => field.current?.focus())
  }, [register])
  const isNearLimit = isNearLimitOf(text.length, input.maxLength)
  return (
    <FieldFrame
      caption={inputCaption(input)}
      isOptional={isOptionalInput(input)}
      note={null}
      problem={props.problem}
    >
      <div data-slot="prompt-field" className="relative">
        <Textarea
          ref={field}
          value={text}
          placeholder={inputPlaceholder(app, input) ?? ""}
          onChange={(event) => props.onChange(event.target.value)}
          className={cn("max-w-none", isNearLimit ? "pb-s8" : "")}
        />
        {isNearLimit ? (
          <span
            data-slot="prompt-count"
            aria-live="polite"
            className="pointer-events-none absolute end-s4 bottom-s2 text-caption text-ink-muted tabular-nums"
          >
            {t("field.prompt.count", {
              count: text.length,
              max: input.maxLength,
            })}
          </span>
        ) : null}
      </div>
    </FieldFrame>
  )
}
