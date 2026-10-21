import type { ReactElement } from "react"
import { t, tCatalog } from "@/copy/t"
import { CollapsibleSection } from "@/pieces/collapsible-section"
import type { PlanShot, RemakePlan } from "@/studio/remake/remake-plan"
import {
  cameraMoveName,
  creditsText,
  routeName,
  shotName,
  shotSpanOf,
} from "@/studio/remake/shot-words"
import { Detail } from "@/viewer/result-panel"

function ShotDetail({ shot }: { shot: PlanShot }): ReactElement {
  const move = shot.cameraMove === null ? null : cameraMoveName(shot.cameraMove)
  return (
    <div data-slot="shot-detail" className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3 px-2">
        <h4 className="text-label text-ink">{shotName(shot)}</h4>
        <p className="text-caption text-ink-muted">{routeName(shot)}</p>
      </div>
      <dl className="flex flex-col">
        <Detail label={t("viewer.label.time")}>{shotSpanOf(shot)}</Detail>
        {shot.model === null ? null : (
          <Detail label={t("viewer.label.model")}>{shot.model}</Detail>
        )}
        {shot.credits === null ? null : (
          <Detail label={t("viewer.label.price")}>
            {creditsText(shot.credits)}
          </Detail>
        )}
        {shot.seed === null ? null : (
          <Detail label={t("viewer.label.seed")}>{shot.seed}</Detail>
        )}
        {shot.words === null ? null : (
          <Detail label={t("viewer.label.prompt")}>{shot.words}</Detail>
        )}
        {move === null ? null : (
          <Detail label={tCatalog("video.input.cameraMove.label")}>
            {move}
          </Detail>
        )}
      </dl>
    </div>
  )
}

export function ShotDetails({ plan }: { plan: RemakePlan }): ReactElement {
  return (
    <CollapsibleSection title={t("viewer.info")}>
      {plan.shots.map((shot) => (
        <ShotDetail key={shot.number} shot={shot} />
      ))}
    </CollapsibleSection>
  )
}
