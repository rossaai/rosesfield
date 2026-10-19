import { Button, IconButton } from "@rosesfield/ui/components/button"
import { CreditPrice } from "@rosesfield/ui/components/credit-price"
import {
  Field,
  FieldCaption,
  FieldMessage,
  FieldNote,
} from "@rosesfield/ui/components/field"
import { Input } from "@rosesfield/ui/components/input"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, EyeIcon, EyeOffIcon } from "lucide-react"
import {
  type FormEvent,
  type ReactElement,
  type ReactNode,
  useState,
} from "react"
import { keepVisitorKey, problemOfKey } from "@/api/visitor-keys"
import { formatNumber } from "@/copy/format"
import { t, tCount } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { DialogOrSheet } from "@/pieces/responsive-layer"
import {
  comfyBillingPage,
  comfyKeyPage,
} from "@/screens/app/hosted/model-notice"
import {
  type Account,
  accountQuery,
  checkKey,
  type KeyStatus,
} from "@/screens/settings/account-query"

export type Refusal = Exclude<KeyStatus, "missing" | "valid">

type RefusalWords = {
  title: CopyKey
  body: CopyKey
  link: { href: string; label: CopyKey } | null
}

const refusals: Readonly<Record<Refusal, RefusalWords>> = {
  wrong: {
    title: "key.wrong.title",
    body: "key.wrong.body",
    link: { href: comfyKeyPage, label: "key.page" },
  },
  "no-plan": {
    title: "key.no-plan.title",
    body: "key.no-plan.body",
    link: { href: comfyBillingPage, label: "key.no-plan.action" },
  },
  "outside-workspace": {
    title: "key.outside-workspace.title",
    body: "key.outside-workspace.body",
    link: { href: comfyKeyPage, label: "key.page" },
  },
  unreachable: {
    title: "key.unreachable.title",
    body: "key.unreachable.body",
    link: null,
  },
}

export function isRefusal(status: KeyStatus): status is Refusal {
  return status !== "missing" && status !== "valid"
}

function ExternalLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}): ReactElement {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-body text-hor-text underline"
    >
      {children}
    </a>
  )
}

export function KeyRefusal({ status }: { status: Refusal }): ReactElement {
  const words = refusals[status]
  return (
    <div role="alert" className="flex flex-col gap-s1">
      <p className="text-body font-medium text-bug-text">{t(words.title)}</p>
      <p className="text-body text-ink-muted">{t(words.body)}</p>
      {words.link === null ? null : (
        <ExternalLink href={words.link.href}>
          {t(words.link.label)}
        </ExternalLink>
      )}
    </div>
  )
}

export function RetentionLine(): ReactNode {
  const days = useQuery(accountQuery).data?.retentionDays ?? null
  return days === null ? null : (
    <p className="text-label text-ink-muted">{tCount("key.retention", days)}</p>
  )
}

export function Balance({ credits }: { credits: number }): ReactElement {
  return (
    <p className="flex items-center gap-s1_5 text-body">
      <CreditPrice
        amount={t("key.balance", { amount: formatNumber(credits) })}
      />
    </p>
  )
}

export function KeyAccepted({
  credits,
  onDone,
}: {
  credits: number | null
  onDone: () => void
}): ReactElement {
  return (
    <div className="flex flex-col gap-s3">
      <p className="flex items-center gap-s1_5 text-body">
        <CheckIcon aria-hidden="true" className="glyph text-ink-muted" />
        {t("key.valid")}
      </p>
      {credits === null ? null : <Balance credits={credits} />}
      <Button tone="primary" className="self-start" onClick={onDone}>
        {t("key.done")}
      </Button>
    </div>
  )
}

function useKeyCheck(onAccepted: () => void) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (key: string) => {
      const account = await checkKey(key)
      if (account.key === "valid") {
        await keepVisitorKey("engine", key)
        client.setQueryData(accountQuery.queryKey, account)
        await client.invalidateQueries({
          predicate: (query) => query.queryKey[0] !== "settings",
        })
        await client.invalidateQueries({ queryKey: ["settings"], exact: true })
        onAccepted()
      }
      return account
    },
  })
}

function KeyField({
  value,
  onChange,
  problem,
}: {
  value: string
  onChange: (value: string) => void
  problem: CopyKey | null
}): ReactElement {
  const [isShown, setShown] = useState(false)
  return (
    <Field invalid={problem !== null} className="max-w-none">
      <FieldCaption>{t("key.field")}</FieldCaption>
      <div className="flex items-center gap-s2">
        <Input
          type={isShown ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => onChange(event.target.value)}
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
        <FieldNote>{t("key.note")}</FieldNote>
      ) : (
        <FieldMessage>{t(problem)}</FieldMessage>
      )}
    </Field>
  )
}

const keyProblems: Readonly<Record<"required" | "invalid", CopyKey>> = {
  required: "settings.visitor.required",
  invalid: "settings.visitor.invalid",
}

export type KeyFormViewProps = {
  value: string
  onChange: (value: string) => void
  problem: CopyKey | null
  refusal: Refusal | null
  busy: boolean
  onSubmit: () => void
}

export function KeyFormView(props: KeyFormViewProps): ReactElement {
  return (
    <form
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        props.onSubmit()
      }}
      className="flex flex-col gap-s3"
    >
      <p className="text-body">{t("key.sentence")}</p>
      <ExternalLink href={comfyKeyPage}>{t("key.page")}</ExternalLink>
      <KeyField
        value={props.value}
        onChange={props.onChange}
        problem={props.problem}
      />
      {props.refusal === null ? null : <KeyRefusal status={props.refusal} />}
      <div className="flex flex-wrap items-center gap-s3">
        <Button type="submit" tone="primary" busy={props.busy}>
          {t("key.save")}
        </Button>
        <RetentionLine />
      </div>
    </form>
  )
}

function refusalOf(account: Account | null, isError: boolean): Refusal | null {
  if (isError) {
    return "unreachable"
  }
  return account !== null && isRefusal(account.key) ? account.key : null
}

export function KeyForm({ onDone }: { onDone: () => void }): ReactElement {
  const [value, setValue] = useState("")
  const [problem, setProblem] = useState<CopyKey | null>(null)
  const check = useKeyCheck(() => setValue(""))
  const account = check.data ?? null
  if (account?.key === "valid") {
    return <KeyAccepted credits={account.credits} onDone={onDone} />
  }
  return (
    <KeyFormView
      value={value}
      onChange={(next) => {
        setProblem(null)
        check.reset()
        setValue(next)
      }}
      problem={problem}
      refusal={refusalOf(account, check.isError)}
      busy={check.isPending}
      onSubmit={() => {
        const found = problemOfKey(value)
        setProblem(found === null ? null : keyProblems[found])
        if (found === null) {
          check.mutate(value.trim())
        }
      }}
    />
  )
}

export function KeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}): ReactElement {
  return (
    <DialogOrSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("key.title")}
    >
      <KeyForm onDone={() => onOpenChange(false)} />
    </DialogOrSheet>
  )
}
