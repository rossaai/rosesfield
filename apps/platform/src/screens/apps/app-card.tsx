import type { AppListing, Run } from "@rosesfield/contract"
import { Card } from "@rosesfield/ui/components/card"
import type { MediaAspect } from "@rosesfield/ui/components/media-tile"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { Link } from "@tanstack/react-router"
import type { ReactElement } from "react"
import { appLine, appName, takesText } from "@/catalog/app-facts"
import { tCount } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"

const frame: MediaAspect = { width: 4, height: 3 }

type AppCardProps = {
  app: AppListing
  newest: Run | null
  working: number
}

export function AppCard({ app, newest, working }: AppCardProps): ReactElement {
  const media = newest?.outputs[0]
  return (
    <Link
      to="/apps/$appId"
      params={{ appId: app.id }}
      className={cn("block rounded-card", motion.press)}
    >
      <Card className="h-full gap-s3 p-s4">
        {media === undefined || newest === null ? null : (
          <AssetTile
            assetId={media}
            shape="frame"
            aspectHint={frame}
            isDemo={newest.origin === "demo"}
            isStatic={true}
          />
        )}
        <div className="flex flex-col gap-s1">
          <h3 className="text-body font-medium">{appName(app)}</h3>
          <p className="text-body text-ink-muted">{appLine(app)}</p>
          <p className="text-caption text-ink-muted">{takesText(app)}</p>
          {working === 0 ? null : (
            <p className="text-caption text-ink">
              {tCount("apps.card.working", working)}
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}
