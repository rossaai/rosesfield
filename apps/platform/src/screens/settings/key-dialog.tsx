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
  useEffect,
  useState,
} from "react"
import { keepVisitorKey, problemOfKey } from "@/api/visitor-keys"
import { formatNumber } from "@/copy/format"
import { t, tCount } from "@/copy/t"
import type { CopyKey } from "@/copy.en"
import { DialogOrSheet } from "@/pieces/responsive-layer"
import { LegalLinks } from "@/screens/legal/legal-links"
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
  busy: {
    title: "key.busy.title",
    body: "key.busy.body",
    link: null,
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

type Checked = {
  key: string
  account: Account
}

function useKeepAccepted(checked: Checked | null): void {
  const client = useQueryClient()
  useEffect(() => {
    if (checked === null || checked.account.key !== "valid") {
      return
    }
    const { key, account } = checked
    void keepVisitorKey("engine", key).then(() => {
      client.setQueryData(accountQuery.queryKey, account)
      return client.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] !== "settings" || query.queryKey.length === 1,
      })
    })
  }, [checked, client])
}

function useKeyCheck() {
  return useMutation({
    mutationFn: async (key: string): Promise<Checked> => ({
      key,
      account: await checkKey(key),
    }),
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
      <LegalLinks />
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
  const check = useKeyCheck()
  useKeepAccepted(check.data ?? null)
  const account = check.data?.account ?? null
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
