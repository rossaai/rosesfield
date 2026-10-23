import type { AppListing } from "@rosesfield/contract"
import { cn } from "@rosesfield/ui/lib/cn"
import {
  BoxIcon,
  FileAudioIcon,
  FileTextIcon,
  ImageIcon,
  TypeIcon,
  UserRoundIcon,
  VideoIcon,
} from "lucide-react"
import type { ReactElement } from "react"
import {
  type OutputKind,
  type TakenKind,
  takenKindsOf,
} from "@/catalog/app-facts"
import { outputKindsOf } from "@/catalog/app-workflows"

type DiscKind = TakenKind | OutputKind

const kindGlyphs = {
  prompt: TypeIcon,
  character: UserRoundIcon,
  image: ImageIcon,
  video: VideoIcon,
  audio: FileAudioIcon,
  text: FileTextIcon,
  mesh: BoxIcon,
} satisfies Record<DiscKind, typeof ImageIcon>

export function KindDisc({
  kind,
  isMade,
}: {
  kind: DiscKind
  isMade: boolean
}): ReactElement {
  const Glyph = kindGlyphs[kind]
  return (
    <span
      data-kind={kind}
      data-made={isMade ? "yes" : "no"}
      className={cn(
        "flex [&_svg]:size-icon [&_svg]:stroke-(length:--stroke-icon)",
        isMade ? "text-ink" : "text-ink-muted"
      )}
    >
      <Glyph />
    </span>
  )
}

export function TakenDiscs({ app }: { app: AppListing }): ReactElement {
  const [kind] = takenKindsOf(app)
  return (
    <span className="flex">
      {kind === undefined ? null : <KindDisc kind={kind} isMade={false} />}
    </span>
  )
}

export function MadeDiscs({ app }: { app: AppListing }): ReactElement {
  const [kind] = outputKindsOf(app)
  return (
    <span className="flex">
      {kind === undefined ? null : <KindDisc kind={kind} isMade={true} />}
    </span>
  )
}

export function KindFlow({ app }: { app: AppListing }): ReactElement {
  return <MadeDiscs app={app} />
}
