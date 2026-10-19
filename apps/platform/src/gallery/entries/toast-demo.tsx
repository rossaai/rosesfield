import { Button } from "@rosesfield/ui/components/button"
import { useToast } from "@rosesfield/ui/components/toast"
import { type ReactElement, useEffect, useRef } from "react"
import { t } from "@/gallery/copy.en"

export function ToastDemo({ open = false }: { open?: boolean }): ReactElement {
  const toasts = useToast()
  const shown = useRef(false)
  const show = (timeout?: number): void => {
    toasts.add({
      title: t("sample.toast.title"),
      actionProps: { children: t("sample.toast.action") },
      ...(timeout === undefined ? {} : { timeout }),
    })
  }
  useEffect(() => {
    if (open && !shown.current) {
      shown.current = true
      show(0)
    }
  })
  return <Button onClick={() => show()}>{t("sample.toast.title")}</Button>
}
