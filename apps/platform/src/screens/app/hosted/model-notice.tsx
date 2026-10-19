import type { ReactElement, ReactNode } from "react"
import { codeOf } from "@/copy/error-words"
import { t } from "@/copy/t"

export const comfyKeyPage = "https://platform.comfy.org/profile/api-keys"
export const comfyBillingPage = "https://platform.comfy.org"

function Notice({
  title,
  body,
  link,
}: {
  title: string
  body: string | null
  link: { href: string; label: string } | null
}): ReactElement {
  return (
    <div role="alert" className="flex flex-col gap-s1 px-s4 py-s2">
      <p className="font-medium text-body text-bug-text">{title}</p>
      {body === null ? null : (
        <p className="text-label text-ink-muted">{body}</p>
      )}
      {link === null ? null : (
        <a
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="text-label text-hor-text underline"
        >
          {link.label}
        </a>
      )}
    </div>
  )
}

export function ModelNotice({ error }: { error: unknown }): ReactNode {
  switch (codeOf(error)) {
    case "ENGINE_KEY_OUTSIDE_WORKSPACE":
      return (
        <Notice
          title={t("model.notice.workspace.title")}
          body={t("model.notice.workspace.body")}
          link={{
            href: comfyKeyPage,
            label: t("model.notice.workspace.action"),
          }}
        />
      )
    case "ENGINE_NOT_ENABLED":
      return (
        <Notice
          title={t("model.notice.account.title")}
          body={t("model.notice.account.body")}
          link={null}
        />
      )
    case "ENGINE_NO_CREDITS":
      return (
        <Notice
          title={t("error.ENGINE_NO_CREDITS.title")}
          body={null}
          link={{
            href: comfyBillingPage,
            label: t("model.notice.credits.action"),
          }}
        />
      )
    default:
      return null
  }
}

export function isModelNoticeCode(error: unknown): boolean {
  return [
    "ENGINE_KEY_OUTSIDE_WORKSPACE",
    "ENGINE_NOT_ENABLED",
    "ENGINE_NO_CREDITS",
  ].includes(codeOf(error))
}
