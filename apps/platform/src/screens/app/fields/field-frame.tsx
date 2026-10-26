import {
  Field,
  FieldCaption,
  FieldHint,
  FieldMessage,
  FieldNote,
} from "@rosesfield/ui/components/field"
import type { ReactElement, ReactNode } from "react"
import { t } from "@/copy/t"
import { useIsRegularWindow } from "@/pieces/use-is-regular"
import type { FieldProblem } from "@/screens/app/app-form"

type FieldFrameProps = {
  caption: string
  isOptional: boolean
  note: string | null
  problem: FieldProblem | undefined
  message?: string | null
  hint?: string | null
  children: ReactNode
  captionEnd?: ReactNode
}

/** Shows a question mark after a setting's label that explains the setting: on hover and on focus in a regular window, on a tap in a compact one. */
export function SettingHint({
  setting,
  text,
}: {
  setting: string
  text: string | null | undefined
}): ReactElement | null {
  const isRegular = useIsRegularWindow()
  if (text === null || text === undefined || text === "") {
    return null
  }
  return (
    <FieldHint
      label={t("field.tip.label", { setting })}
      text={text}
      place={isRegular ? "hover" : "tap"}
    />
  )
}

export function FieldFrame(props: FieldFrameProps): ReactElement {
  const message =
    props.message ??
    (props.problem === undefined
      ? null
      : t(props.problem.key, props.problem.values))
  const end =
    props.captionEnd ??
    (props.isOptional ? <span>{t("field.optional")}</span> : null)
  return (
    <Field invalid={message !== null} className="max-w-none">
      <div
        data-slot="field-caption-row"
        className="flex min-w-0 items-center gap-s1_5 pe-s5 text-label text-ink-muted"
      >
        <FieldCaption className="pe-0">
          <span>{props.caption}</span>
        </FieldCaption>
        <SettingHint setting={props.caption} text={props.hint} />
        {end === null ? null : (
          <span className="ms-auto flex items-center">{end}</span>
        )}
      </div>
      {props.children}
      {message === null ? (
        props.note === null ? null : (
          <FieldNote>{props.note}</FieldNote>
        )
      ) : (
        <FieldMessage>{message}</FieldMessage>
      )}
    </Field>
  )
}
