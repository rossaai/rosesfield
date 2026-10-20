import { Button } from "@rosesfield/ui/components/button"
import { MediaTile } from "@rosesfield/ui/components/media-tile"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import type { ReactElement, ReactNode } from "react"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { t } from "@/copy/t"
import { AudioRow } from "@/pieces/audio-row"
import { sharedEntries } from "@/screens/explore/explore-entries"
import { exploreCaption } from "@/screens/explore/explore-tile"
import { type SharedOutput, shareQuery } from "@/screens/explore/share-api"
import { Lockup } from "@/shell/brand-mark"

function Frame({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="@container min-h-dvh bg-canvas text-ink">
      <div className="mx-auto flex w-full max-w-prompt-max flex-col gap-s6 px-s5 py-s5">
        <header className="flex items-center justify-between gap-s3">
          <Link to="/" className="flex items-center">
            <Lockup />
          </Link>
        </header>
        {children}
      </div>
    </div>
  )
}

function SharedOutputView({ share }: { share: SharedOutput }): ReactElement {
  const [entry] = sharedEntries([share])
  if (entry === undefined || entry.source.kind !== "share") {
    return <Gone />
  }
  const label = t("share.page.label")
  return (
    <main className="flex flex-col gap-s3">
      {entry.kind === "audio" ? (
        <AudioRow src={entry.source.src} name={label} durationSeconds={null} />
      ) : (
        <MediaTile
          kind={entry.kind}
          src={entry.source.src}
          alt={label}
          fit="contain"
          {...(entry.aspect === undefined ? {} : { aspect: entry.aspect })}
        />
      )}
      <p className="text-body text-ink-muted">
        {exploreCaption(share.run, null)}
      </p>
      <p data-slot="share-machine-made" className="text-label text-ink-muted">
        {t("explore.tile.machineMade")}
      </p>
      <div className="flex flex-wrap items-center gap-s2">
        <Button
          tone="primary"
          nativeButton={false}
          render={
            <Link
              to="/apps/$appId"
              params={{ appId: share.run.appId }}
              search={{ share: share.id }}
            />
          }
        >
          {t("share.page.recreate")}
        </Button>
        <Button tone="quiet" nativeButton={false} render={<Link to="/" />}>
          {t("share.page.open")}
        </Button>
      </div>
    </main>
  )
}

function Gone(): ReactElement {
  return (
    <StateView
      kind="empty"
      title={t("share.page.gone.title")}
      body={t("share.page.gone.body")}
      actions={
        <Button tone="primary" nativeButton={false} render={<Link to="/" />}>
          {t("share.page.open")}
        </Button>
      }
    />
  )
}

export function ShareScreen({ shareId }: { shareId: string }): ReactElement {
  const share = useQuery(shareQuery(shareId))
  if (share.isPending) {
    return (
      <Frame>
        <Skeleton className="aspect-square w-full rounded-cell" />
        <Skeleton className="h-s5 w-2/3" />
      </Frame>
    )
  }
  if (share.isError) {
    const isGone =
      share.error instanceof GatewayRefusedError && share.error.status === 404
    return (
      <Frame>
        {isGone ? (
          <Gone />
        ) : (
          <StateView
            kind="failed"
            title={t("share.page.failed.title")}
            actions={
              <Button tone="primary" onClick={() => void share.refetch()}>
                {t("state.tryAgain")}
              </Button>
            }
          />
        )}
      </Frame>
    )
  }
  return (
    <Frame>
      <SharedOutputView share={share.data} />
    </Frame>
  )
}
