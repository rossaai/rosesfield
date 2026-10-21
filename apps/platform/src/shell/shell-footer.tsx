import { Footer, type FooterGroup } from "@rosesfield/ui/components/footer"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import { legalPaths } from "@/screens/legal/legal-links"

const repository = "https://github.com/rossaai/rosesfield"

export const footerLinks = {
  code: repository,
  challenge: "https://comfy.org/open-source-higgsfield",
  privacy: legalPaths.privacy,
  terms: legalPaths.terms,
  trademarks: `${repository}/blob/main/TRADEMARKS.md`,
} as const

function footerGroups(): FooterGroup[] {
  return [
    {
      id: "project",
      heading: t("shell.footer.project"),
      links: [
        { id: "code", label: t("shell.footer.code"), href: footerLinks.code },
        {
          id: "challenge",
          label: t("shell.footer.challenge"),
          href: footerLinks.challenge,
        },
      ],
    },
    {
      id: "legal",
      heading: t("shell.footer.legal"),
      links: [
        {
          id: "privacy",
          label: t("shell.footer.privacy"),
          href: footerLinks.privacy,
        },
        {
          id: "terms",
          label: t("shell.footer.terms"),
          href: footerLinks.terms,
        },
      ],
    },
  ]
}

export function ShellFooter(): ReactElement {
  return (
    <Footer
      label={t("shell.name")}
      heading={t("shell.footer.heading")}
      groups={footerGroups()}
      notice={t("shell.footer.notice")}
      legal={[
        {
          id: "trademarks",
          label: t("shell.footer.trademarks"),
          href: footerLinks.trademarks,
        },
      ]}
    />
  )
}
