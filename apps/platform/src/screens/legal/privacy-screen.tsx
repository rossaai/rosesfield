import type { ReactElement } from "react"
import { legalPages } from "@/screens/legal/legal-links"
import { LegalPage, type LegalSection } from "@/screens/legal/legal-page"

export const privacySections: readonly LegalSection[] = [
  {
    id: "key",
    title: "legal.privacy.key.title",
    body: ["legal.privacy.key.body"],
  },
  {
    id: "kept",
    title: "legal.privacy.kept.title",
    body: [
      "legal.privacy.kept.account",
      "legal.privacy.kept.work",
      "legal.privacy.kept.shared",
      "legal.privacy.kept.where",
    ],
  },
  {
    id: "cookie",
    title: "legal.privacy.cookie.title",
    body: ["legal.privacy.cookie.body"],
  },
  {
    id: "logs",
    title: "legal.privacy.logs.title",
    body: ["legal.privacy.logs.body"],
  },
  {
    id: "ask",
    title: "legal.privacy.ask.title",
    body: ["legal.privacy.ask.body"],
    link: { href: legalPages.issues, label: "legal.issue" },
  },
]

export function PrivacyScreen(): ReactElement {
  return (
    <LegalPage
      title="legal.privacy.title"
      line="legal.privacy.line"
      intro="legal.privacy.scope"
      sections={privacySections}
    />
  )
}
