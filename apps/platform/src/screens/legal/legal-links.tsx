import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { repository } from "@/screens/welcome/welcome-links"

export const legalPaths = {
  privacy: "/privacy",
  terms: "/terms",
} as const

export const legalPages = {
  issues: `${repository}/issues`,
  licence: `${repository}/blob/main/LICENSE`,
  comfyTerms: "https://www.comfy.org/terms-of-service",
} as const

export const legalLinkClass = "text-body text-hor-text underline"

export function LegalLinks(): ReactElement {
  return (
    <p className="flex flex-wrap items-baseline gap-x-s3 gap-y-s1 text-label text-ink-muted">
      <span>{t("key.legal")}</span>
      <a
        href={legalPaths.privacy}
        target="_blank"
        rel="noreferrer"
        className={legalLinkClass}
      >
        {t("shell.footer.privacy")}
      </a>
      <a
        href={legalPaths.terms}
        target="_blank"
        rel="noreferrer"
        className={legalLinkClass}
      >
        {t("shell.footer.terms")}
      </a>
    </p>
  )
}
