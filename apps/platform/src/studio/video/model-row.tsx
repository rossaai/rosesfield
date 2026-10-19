import { ModelPicker } from "@rosesfield/ui/components/model-picker"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion } from "@rosesfield/ui/motion"
import { ChevronRightIcon } from "lucide-react"
import type { ReactElement } from "react"
import { t, tCatalog } from "@/copy/t"
import {
  makerNameOf,
  modelNameOf,
  pickerSections,
} from "@/screens/app/hosted/catalog-picker"
import { ModelNotice } from "@/screens/app/hosted/model-notice"
import type { HostedState } from "@/screens/app/hosted/use-hosted-model"

export function ModelRow({ hosted }: { hosted: HostedState }): ReactElement {
  const caption = tCatalog("video.input.model.label")
  const chosen = hosted.chosen
  const name = chosen === null ? t("model.picker.title") : modelNameOf(chosen)
  const trigger = (
    <button
      type="button"
      aria-label={`${caption} ${name}`}
      className={cn(
        "flex w-full items-center gap-s3 rounded-field bg-(--well) px-s5 py-s2 text-left outline-none hover:bg-(--tint) focus-visible:outline-2 focus-visible:outline-hor-text",
        motion.tint
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-label text-ink-muted">{caption}</span>
        <span className="flex min-w-0 items-baseline gap-s1_5">
          <span className="truncate font-medium text-body text-ink">
            {name}
          </span>
          {chosen === null ? null : (
            <span className="shrink-0 text-caption text-ink-muted">
              {makerNameOf(chosen)}
            </span>
          )}
        </span>
      </span>
      <ChevronRightIcon aria-hidden="true" className="glyph text-ink-muted" />
    </button>
  )
  return (
    <ModelPicker
      trigger={trigger}
      title={t("model.picker.title")}
      searchLabel={t("model.picker.search")}
      searchPlaceholder={t("model.picker.searchPlaceholder")}
      emptyLabel={t("model.picker.empty")}
      sections={pickerSections(hosted)}
      chosen={chosen?.id ?? null}
      onChoose={hosted.choose}
      isLoading={hosted.isLoading}
      notice={
        hosted.error === null ? null : <ModelNotice error={hosted.error} />
      }
    />
  )
}
