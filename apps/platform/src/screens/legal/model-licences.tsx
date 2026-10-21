import type { ReactElement } from "react"
import { appName } from "@/catalog/app-facts"
import { appWorkflows } from "@/catalog/app-workflows"
import { catalogApps } from "@/catalog/catalog-apps"
import { formatList } from "@/copy/format"
import { t } from "@/copy/t"
import { legalLinkClass } from "@/screens/legal/legal-links"
import { modelRowsOf, openModelLabel } from "@/screens/welcome/open-weights"
import { repository } from "@/screens/welcome/welcome-links"

export function ModelLicences(): ReactElement {
  const rows = modelRowsOf(catalogApps, appWorkflows)
  return (
    <div className="flex flex-col gap-s3">
      <ul data-slot="model-licences" className="flex flex-col">
        {rows.map(({ model, apps }) => (
          <li
            key={model.id}
            className="flex flex-col gap-s1 border-b border-(--line) py-s3 last:border-b-0"
          >
            <span className="flex flex-wrap items-baseline justify-between gap-s2">
              <span className="text-body font-medium">
                {openModelLabel(model)}
              </span>
              <a
                href={model.link}
                className={legalLinkClass}
                target="_blank"
                rel="noreferrer"
              >
                {t(`welcome.licence.${model.licence}`)}
              </a>
            </span>
            <span className="text-caption text-ink-muted">
              {t("welcome.models.usedBy", {
                apps: formatList(apps.map(appName)),
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-body">
        {t("welcome.models.parts")}{" "}
        <a
          href={`${repository}#engines-and-licences`}
          className={legalLinkClass}
          target="_blank"
          rel="noreferrer"
        >
          {t("welcome.models.partsLink")}
        </a>
      </p>
    </div>
  )
}
