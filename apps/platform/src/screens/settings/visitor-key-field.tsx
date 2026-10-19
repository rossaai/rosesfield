import { Button, IconButton } from "@rosesfield/ui/components/button"
import {
  Field,
  FieldCaption,
  FieldMessage,
  FieldNote,
} from "@rosesfield/ui/components/field"
import { Input } from "@rosesfield/ui/components/input"
import { useQueryClient } from "@tanstack/react-query"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { type FormEvent, type ReactElement, useState } from "react"
import {
  forgetVisitorKey,
  keepVisitorKey,
  problemOfKey,
  useHasVisitorKey,
  type VisitorKeyKind,
  type VisitorKeyProblem,
} from "@/api/visitor-keys"
import { t } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { noteAgentModel } from "@/screens/agent/agent-model"

const labels: Readonly<Record<VisitorKeyKind, CopyKey>> = {
  engine: "settings.visitor.engine.label",
  agent: "settings.visitor.agent.label",
}

const problems: Readonly<Record<NonNullable<VisitorKeyProblem>, CopyKey>> = {
  required: "settings.visitor.required",
  invalid: "settings.visitor.invalid",
}

function useKeyChange(): () => void {
  const client = useQueryClient()
  return () => {
    noteAgentModel("unknown")
    void client.invalidateQueries({ queryKey: ["settings"] })
    void client.invalidateQueries({ queryKey: ["conversations"] })
  }
}

function KeptKey({ kind }: { kind: VisitorKeyKind }): ReactElement {
  const changed = useKeyChange()
  return (
    <div className="flex flex-col gap-s2">
      <div className="flex flex-wrap items-center justify-between gap-s2">
        <p className="text-body">{t("settings.visitor.kept")}</p>
        <Button
          onClick={() => {
            void forgetVisitorKey(kind).then(changed)
          }}
        >
          {t("settings.visitor.forget")}
        </Button>
      </div>
      <p className="text-label text-ink-muted">{t("settings.visitor.note")}</p>
    </div>
  )
}

function KeyForm({ kind }: { kind: VisitorKeyKind }): ReactElement {
  const [value, setValue] = useState("")
  const [isShown, setShown] = useState(false)
  const [problem, setProblem] = useState<VisitorKeyProblem>(null)
  const changed = useKeyChange()
  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const found = problemOfKey(value)
    setProblem(found)
    if (found === null) {
      void keepVisitorKey(kind, value).then(changed)
    }
  }
  return (
    <form onSubmit={save} className="flex flex-col gap-s2">
      <Field invalid={problem !== null} className="max-w-none">
        <FieldCaption>{t(labels[kind])}</FieldCaption>
        <div className="flex items-center gap-s2">
          <Input
            type={isShown ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(event) => {
              setProblem(null)
              setValue(event.target.value)
            }}
            className="max-w-none"
          />
          <IconButton
            label={
              isShown ? t("settings.visitor.hide") : t("settings.visitor.show")
            }
            tone="quiet"
            onClick={() => setShown(!isShown)}
          >
            {isShown ? (
              <EyeOffIcon aria-hidden="true" />
            ) : (
              <EyeIcon aria-hidden="true" />
            )}
          </IconButton>
        </div>
        {problem === null ? (
          <FieldNote>{t("settings.visitor.note")}</FieldNote>
        ) : (
          <FieldMessage>{t(problems[problem])}</FieldMessage>
        )}
      </Field>
      <Button type="submit" className="self-start">
        {t("settings.visitor.save")}
      </Button>
    </form>
  )
}

export function VisitorKeyField({
  kind,
}: {
  kind: VisitorKeyKind
}): ReactElement {
  const hasKey = useHasVisitorKey(kind)
  return hasKey ? <KeptKey kind={kind} /> : <KeyForm kind={kind} />
}
