import type { ReactElement } from "react"
import { legalPages } from "@/screens/legal/legal-links"
import { LegalPage, type LegalSection } from "@/screens/legal/legal-page"
import { ModelLicences } from "@/screens/legal/model-licences"

export const termsSections: readonly LegalSection[] = [
  {
    id: "software",
    title: "legal.terms.software.title",
    body: ["legal.terms.software.body"],
  },
  {
    id: "runs",
    title: "legal.terms.runs.title",
    body: ["legal.terms.runs.body"],
    link: { href: legalPages.comfyTerms, label: "legal.terms.runs.action" },
  },
  {
    id: "rights",
    title: "legal.terms.rights.title",
    body: ["legal.terms.rights.body"],
  },
  {
    id: "age",
    title: "legal.terms.age.title",
    body: ["legal.terms.age.body"],
  },
  {
    id: "warranty",
    title: "legal.terms.warranty.title",
    body: ["legal.terms.warranty.body"],
    link: { href: legalPages.licence, label: "legal.terms.warranty.action" },
  },
  {
    id: "removal",
    title: "legal.terms.removal.title",
    body: ["legal.terms.removal.body"],
    link: { href: legalPages.issues, label: "legal.issue" },
  },
  {
    id: "models",
    title: "legal.terms.models.title",
    body: ["legal.terms.models.body"],
    extra: <ModelLicences />,
  },
]

export function TermsScreen(): ReactElement {
  return (
    <LegalPage
      title="legal.terms.title"
      line="legal.terms.line"
      sections={termsSections}
    />
  )
}
