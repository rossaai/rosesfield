import type { Character } from "@rosesfield/contract"
import { Button, IconButton } from "@rosesfield/ui/components/button"
import { Card } from "@rosesfield/ui/components/card"
import { interaction } from "@rosesfield/ui/components/interaction"
import { Skeleton, SkeletonGroup } from "@rosesfield/ui/components/skeleton"
import { StateView } from "@rosesfield/ui/components/state-view"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import type { ReactElement, ReactNode } from "react"
import { charactersQuery } from "@/api/queries"
import { t, tCount } from "@/copy/t"
import { AssetTile } from "@/pieces/asset-tile"
import { ScreenHeader } from "@/shell/screen-header"

function CharacterCard({ character }: { character: Character }): ReactElement {
  const first = character.references[0]
  return (
    <Link
      to="/characters/$characterId"
      params={{ characterId: character.id }}
      className={cn(
        "relative block rounded-card",
        motion.press,
        interaction.ring
      )}
    >
      <Card className="gap-s3 p-s4">
        {first === undefined ? null : (
          <AssetTile assetId={first} shape="square" isStatic={true} />
        )}
        <div className="flex flex-col gap-s1">
          <h2 className="truncate text-body font-medium">{character.name}</h2>
          <p className="text-caption text-ink-muted">
            {tCount("characters.photos", character.references.length)}
          </p>
        </div>
      </Card>
    </Link>
  )
}

const grid = "grid grid-cols-2 gap-s3 @regular:grid-cols-4"

export const characterSkeletonCount = 2

function CharacterCardSkeleton(): ReactElement {
  return (
    <SkeletonGroup data-skeleton="character">
      <Card className="gap-s3 p-s4">
        <Skeleton shape="thumbnail" />
        <div className="flex flex-col gap-s1">
          <Skeleton shape="line" text="body" measure="mid" />
          <Skeleton shape="line" text="caption" measure="short" />
        </div>
      </Card>
    </SkeletonGroup>
  )
}

function CharacterList(): ReactNode {
  const characters = useQuery(charactersQuery)
  if (characters.isPending) {
    return (
      <div className={grid}>
        {Array.from({ length: characterSkeletonCount }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a skeleton's place is its identity
          <CharacterCardSkeleton key={index} />
        ))}
      </div>
    )
  }
  if (characters.isError) {
    return (
      <StateView
        kind="failed"
        title={t("characters.failed.title")}
        actions={
          <Button onClick={() => void characters.refetch()}>
            {t("state.tryAgain")}
          </Button>
        }
      />
    )
  }
  const list = characters.data.characters
  if (list.length === 0) {
    return (
      <StateView
        kind="empty"
        title={t("characters.empty.title")}
        body={t("characters.empty.body")}
        actions={
          <Button
            tone="primary"
            render={<Link to="/characters/new" />}
            nativeButton={false}
          >
            {t("characters.empty.action")}
          </Button>
        }
      />
    )
  }
  return (
    <div className={grid}>
      {list.map((character) => (
        <CharacterCard key={character.id} character={character} />
      ))}
    </div>
  )
}

export function CharactersScreen(): ReactElement {
  return (
    <>
      <ScreenHeader
        title={t("characters.title")}
        actions={
          <Button
            tone="primary"
            render={<Link to="/characters/new" />}
            nativeButton={false}
          >
            {t("characters.add")}
          </Button>
        }
        phoneAction={
          <IconButton
            label={t("characters.add")}
            tone="quiet"
            render={<Link to="/characters/new" />}
            nativeButton={false}
          >
            <PlusIcon aria-hidden="true" />
          </IconButton>
        }
      />
      <div className="px-s5 pb-s12">
        <CharacterList />
      </div>
    </>
  )
}
