import {
  Field,
  FieldCaption,
  FieldMessage,
  FieldNote,
} from "@rosesfield/ui/components/field"
import type { ReactElement, ReactNode } from "react"
import { t } from "@/copy/t"
import type { FieldProblem } from "@/screens/app/app-form"

type FieldFrameProps = {
  caption: string
  isOptional: boolean
  note: string | null
  problem: FieldProblem | undefined
  message?: string | null
  children: ReactNode
  captionEnd?: ReactNode
}

export function FieldFrame(props: FieldFrameProps): ReactElement {
  const message =
    props.message ??
    (props.problem === undefined
      ? null
      : t(props.problem.key, props.problem.values))
  return (
    <Field invalid={message !== null} className="max-w-none">
      <FieldCaption>
        <span>{props.caption}</span>
        {props.captionEnd ??
          (props.isOptional ? <span>{t("field.optional")}</span> : null)}
      </FieldCaption>
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
