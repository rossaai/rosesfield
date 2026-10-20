import type { Character, Run } from "@rosesfield/contract"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rosesfield/ui/components/dropdown-menu"
import { MediaGrid } from "@rosesfield/ui/components/media-grid"
import { Skeleton } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "@tanstack/react-router"
import { EllipsisIcon, XIcon } from "lucide-react"
import { type ReactElement, type ReactNode, useState } from "react"
import { GatewayRefusedError } from "@/api/gateway-refused.error"
import { characterQuery } from "@/api/queries"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"
import { AssetTile } from "@/pieces/asset-tile"
import { ContentEndMark, Dock, useContentEnd } from "@/pieces/dock"
import { ScreenState } from "@/pieces/screen-state"
import { useUseInItems } from "@/pieces/use-in-menu"
import { useUploads } from "@/pieces/use-uploads"
import {
  DeleteCharacterDialog,
  RenameDialog,
  useUpdateCharacter,
} from "@/screens/characters/character-actions"
import { ScreenHeader } from "@/shell/screen-header"
import { useRecentRuns } from "@/shell/use-working-runs"

function usedCharacter(run: Run, characterId: string): boolean {
  return Object.values(run.inputs).some(
    (value) => Array.isArray(value) && value.some((one) => one === characterId)
  )
}

function UseInMenu({
  character,
  className,
}: {
  character: Character
  className?: string
}): ReactElement {
  const items = useUseInItems({ kind: "character", useId: character.id })
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={items.length === 0}
        render={
          <Button tone="primary" className={className}>
            {t("characters.detail.useIn")}
          </Button>
        }
      />
      <DropdownMenuContent align="end">{items}</DropdownMenuContent>
    </DropdownMenu>
  )
}

function MoreMenu({ character }: { character: Character }): ReactElement {
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton label={t("characters.detail.more")} tone="quiet">
              <EllipsisIcon aria-hidden="true" />
            </IconButton>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDialog("rename")}>
            {t("characters.detail.rename")}
          </DropdownMenuItem>
          <DropdownMenuItem tone="danger" onClick={() => setDialog("delete")}>
            {t("characters.detail.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <RenameDialog
        character={character}
        open={dialog === "rename"}
        onOpenChange={(open) => setDialog(open ? "rename" : null)}
      />
      <DeleteCharacterDialog
        characterId={character.id}
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
      />
    </>
  )
}

function Photos({ character }: { character: Character }): ReactElement {
  const update = useUpdateCharacter(character.id)
  const uploads = useUploads()
  const device = useDevice()
  const isLast = character.references.length <= 1
  const addPhotos = (): void => {
    void device
      .pickFiles({ accept: ["image/*"], multiple: true })
      .then(uploads.start)
      .then((assets) => {
        const references = [
          ...character.references,
          ...assets.map((asset) => asset.id),
        ].slice(0, 16)
        update.mutate({ references })
      })
  }
  return (
    <section className="flex flex-col gap-s3">
      <div className="flex items-center justify-between gap-s2">
        <h2 className="text-body font-medium">
          {t("characters.detail.photos")}
        </h2>
        <span className="flex flex-wrap items-center justify-end gap-s2">
          <Button size="small" busy={update.isPending} onClick={addPhotos}>
            {t("characters.detail.addPhotos")}
          </Button>
          <Button
            size="small"
            render={
              <Link
                to="/apps/$appId"
                params={{ appId: "characters" }}
                search={{ use: character.id }}
              />
            }
            nativeButton={false}
          >
            {t("characters.detail.angles")}
          </Button>
        </span>
      </div>
      <MediaGrid>
        {character.references.map((id) => (
          <div key={id} className="relative">
            <AssetTile
              assetId={id}
              shape="square"
              list={character.references}
            />
            <IconButton
              label={
                isLast
                  ? t("characters.detail.lastPhoto")
                  : t("characters.detail.removePhoto")
              }
              size="badge"
              disabled={isLast}
              focusableWhenDisabled={true}
              className="material absolute top-s1 right-s1 data-disabled:pointer-events-auto"
              onClick={() =>
                update.mutate({
                  references: character.references.filter((one) => one !== id),
                })
              }
            >
              <XIcon aria-hidden="true" />
            </IconButton>
          </div>
        ))}
      </MediaGrid>
    </section>
  )
}

function CharacterRuns({ characterId }: { characterId: string }): ReactNode {
  const runs = useRecentRuns().filter((run) => usedCharacter(run, characterId))
  const outputs = runs.flatMap((run) => run.outputs)
  const demoOutputs = new Set(
    runs.filter((run) => run.origin === "demo").flatMap((run) => run.outputs)
  )
  return (
    <section className="flex flex-col gap-s3">
      <h2 className="text-body font-medium">{t("characters.detail.runs")}</h2>
      {outputs.length === 0 ? (
        <StateView
          kind="empty"
          density="compact"
          className="p-0"
          title={t("characters.detail.runsEmpty")}
          actions={
            <Button render={<Link to="/apps" />} nativeButton={false}>
              {t("characters.detail.runsAction")}
            </Button>
          }
        />
      ) : (
        <MediaGrid>
          {outputs.map((id) => (
            <div key={id}>
              <AssetTile
                assetId={id}
                shape="square"
                list={outputs}
                isDemo={demoOutputs.has(id)}
              />
            </div>
          ))}
        </MediaGrid>
      )}
    </section>
  )
}

function Loading(): ReactElement {
  return (
    <>
      <ScreenHeader title={<Skeleton className="h-s5 w-tile" />} />
      <div className="px-s5">
        <MediaGrid>
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} />
          ))}
        </MediaGrid>
      </div>
    </>
  )
}

export function CharacterScreen(): ReactElement {
  const { characterId } = useParams({ from: "/_shell/characters/$characterId" })
  const character = useQuery(characterQuery(characterId))
  if (character.isPending) {
    return <Loading />
  }
  if (character.isError) {
    const isMissing =
      character.error instanceof GatewayRefusedError &&
      character.error.status === 404
    return (
      <>
        <ScreenHeader title={t("characters.title")} />
        <ScreenState
          kind={isMissing ? "empty" : "failed"}
          title={
            isMissing
              ? t("characters.missing.title")
              : t("characters.failed.title")
          }
          actions={
            isMissing ? (
              <Button
                tone="primary"
                render={<Link to="/characters" />}
                nativeButton={false}
              >
                {t("characters.missing.action")}
              </Button>
            ) : (
              <Button onClick={() => void character.refetch()}>
                {t("state.tryAgain")}
              </Button>
            )
          }
        />
      </>
    )
  }
  return <CharacterDetail character={character.data.character} />
}

function CharacterDetail({
  character: found,
}: {
  character: Character
}): ReactElement {
  const end = useContentEnd()
  return (
    <div className="flex min-h-full flex-col">
      <ScreenHeader
        title={found.name}
        actions={
          <>
            <UseInMenu character={found} />
            <MoreMenu character={found} />
          </>
        }
        phoneAction={<MoreMenu character={found} />}
      />
      <div className="flex flex-1 flex-col gap-s8 px-s5 pb-s12">
        <Photos character={found} />
        <CharacterRuns characterId={found.id} />
      </div>
      <ContentEndMark end={end} />
      <Dock
        isRaised={end.isContentBelow}
        className="sticky bottom-0 px-s5 py-s3 @regular:hidden"
      >
        <UseInMenu character={found} className="w-full max-w-none" />
      </Dock>
    </div>
  )
}
