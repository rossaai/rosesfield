import { Button, IconButton } from "@rosesfield/ui/components/button"
import {
  Field,
  FieldCaption,
  FieldMessage,
} from "@rosesfield/ui/components/field"
import { Input } from "@rosesfield/ui/components/input"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Navigate, useRouter, useSearch } from "@tanstack/react-router"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { type FormEvent, type ReactElement, useState } from "react"
import { keepOwnerToken } from "@/api/owner-token"
import { settingsQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { checkToken } from "@/screens/unlock/check-token"

type Problem = { text: string; canRetry: boolean } | null

function useUnlock(): {
  isBusy: boolean
  problem: Problem
  submit: (token: string) => Promise<void>
} {
  const [isBusy, setBusy] = useState(false)
  const [problem, setProblem] = useState<Problem>(null)
  const router = useRouter()
  const client = useQueryClient()
  const search = useSearch({ from: "/unlock" })
  const submit = async (token: string): Promise<void> => {
    if (token.trim() === "") {
      setProblem({ text: t("unlock.error.required"), canRetry: false })
      return
    }
    setBusy(true)
    const check = await checkToken(token.trim())
    setBusy(false)
    if (check.result === "accepted") {
      await keepOwnerToken(token.trim())
      await client.resetQueries()
      router.history.push(search.next ?? "/")
      return
    }
    setProblem(
      check.result === "mismatch"
        ? { text: t("unlock.error.mismatch"), canRetry: false }
        : check.result === "rateLimited"
          ? {
              text: t("unlock.error.rateLimited", { seconds: check.seconds }),
              canRetry: false,
            }
          : { text: t("unlock.error.unreachable"), canRetry: true }
    )
  }
  return { isBusy, problem, submit }
}

export function UnlockScreen(): ReactElement {
  const [token, setToken] = useState("")
  const [isShown, setShown] = useState(false)
  const unlock = useUnlock()
  const settings = useQuery(settingsQuery)
  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    void unlock.submit(token)
  }
  if (settings.data?.mode === "public") {
    return <Navigate to="/" replace={true} />
  }
  return (
    <main className="@container flex min-h-dvh justify-center bg-canvas px-s5 pt-s12 text-ink">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-prose-max flex-col gap-s4 @regular:justify-center @regular:pb-s12"
      >
        <p className="text-body font-medium">{t("shell.name")}</p>
        <h1 className="text-display">{t("unlock.title")}</h1>
        <p className="text-body text-ink-muted">{t("unlock.body")}</p>
        <Field invalid={unlock.problem !== null} className="max-w-none">
          <FieldCaption>{t("unlock.field.label")}</FieldCaption>
          <div className="flex items-center gap-s2">
            <Input
              type={isShown ? "text" : "password"}
              name="token"
              autoComplete="current-password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="max-w-none"
            />
            <IconButton
              label={isShown ? t("unlock.field.hide") : t("unlock.field.show")}
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
          {unlock.problem === null ? null : (
            <FieldMessage>{unlock.problem.text}</FieldMessage>
          )}
        </Field>
        <div className="flex gap-s2">
          <Button type="submit" tone="primary" busy={unlock.isBusy}>
            {unlock.problem?.canRetry === true
              ? t("state.tryAgain")
              : t("unlock.action")}
          </Button>
        </div>
        <p className="text-body text-ink-muted">{t("unlock.note")}</p>
      </form>
    </main>
  )
}
