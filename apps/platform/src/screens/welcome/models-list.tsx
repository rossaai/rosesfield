import type { ReactElement } from "react"
import { appName } from "@/catalog/app-facts"
import { appWorkflows } from "@/catalog/app-workflows"
import { catalogApps } from "@/catalog/catalog-apps"
import { formatList } from "@/copy/format"
import { t } from "@/copy/t"
import {
  agentModelLink,
  modelRowsOf,
  openModelLabel,
} from "@/screens/welcome/open-weights"
import { repository } from "@/screens/welcome/welcome-links"

const linkClass = "text-body text-hor-text underline"

function ModelRows(): ReactElement {
  const rows = modelRowsOf(catalogApps, appWorkflows)
  return (
    <ul className="flex flex-col">
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
              className={linkClass}
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
  )
}

export function ModelsList(): ReactElement {
  return (
    <div className="flex max-w-prompt-max flex-col gap-s4">
      <ModelRows />
      <p className="max-w-prose-max text-body">
        {t("welcome.models.agent")}{" "}
        <a
          href={agentModelLink}
          className={linkClass}
          target="_blank"
          rel="noreferrer"
        >
          {t("welcome.models.agentLink")}
        </a>
      </p>
      <p className="max-w-prose-max text-body">
        {t("welcome.models.check")}{" "}
        <a
          href={`${repository}/blob/main/packages/catalog/test/open-weights.test.ts`}
          className={linkClass}
        >
          {t("welcome.models.checkLink")}
        </a>
      </p>
      <p className="max-w-prose-max text-body">
        {t("welcome.models.parts")}{" "}
        <a href={`${repository}#engines-and-licences`} className={linkClass}>
          {t("welcome.models.partsLink")}
        </a>
      </p>
    </div>
  )
}
