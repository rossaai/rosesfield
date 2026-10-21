import { Skeleton } from "@rosesfield/ui/components/skeleton"
import type { ReactElement } from "react"
import { useAssetSource } from "@/api/use-asset-source"
import { t } from "@/copy/t"
import type { EditPhoto } from "@/studio/edit/use-edit-photo"

export function PhotoView({
  photo,
}: {
  photo: EditPhoto
}): ReactElement | null {
  const source = useAssetSource(photo.photo ?? "")
  if (photo.photo === null) {
    return null
  }
  const size = photo.reading.state === "read" ? photo.reading.facts.size : null
  return (
    <figure data-slot="edit-photo" className="m-0 flex justify-center pb-s4">
      {source.state === "ready" && size !== null ? (
        <img
          src={source.src}
          alt={t("viewer.compare.yours")}
          width={size.width}
          height={size.height}
          className="block h-auto max-h-[50dvh] w-auto max-w-full rounded-dense object-contain"
        />
      ) : (
        <Skeleton className="h-s12 w-1/2" />
      )}
    </figure>
  )
}
