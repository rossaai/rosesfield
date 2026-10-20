import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { buttonVariants } from "@rosesfield/ui/components/button"
import { cn } from "@rosesfield/ui/lib/cn"
import { motion, readDuration } from "@rosesfield/ui/motion"
import { type ReactElement, type ReactNode, useState } from "react"

type ToastProviderProps = {
  children: ReactNode
}

function ToastProvider({ children }: ToastProviderProps): ReactElement {
  const [timeout] = useState(() => readDuration("--duration-toast"))
  return (
    <ToastPrimitive.Provider
      {...(timeout === undefined ? {} : { timeout })}
      limit={3}
    >
      {children}
    </ToastPrimitive.Provider>
  )
}

function ToastItem({
  toast,
}: {
  toast: ToastPrimitive.Root.ToastObject
}): ReactElement {
  return (
    <ToastPrimitive.Root
      toast={toast}
      swipeDirection="up"
      data-ground="layer"
      className={cn(
        "material flex w-full items-center gap-s3 rounded-card px-s5 py-s3 text-ink shadow-float [--transform-origin:top_center] data-limited:hidden",
        motion.popover
      )}
    >
      <ToastPrimitive.Content className="flex min-w-0 flex-1 flex-col gap-s1">
        <ToastPrimitive.Title className="text-label font-medium text-ink" />
        <ToastPrimitive.Description className="text-label text-ink-muted" />
      </ToastPrimitive.Content>
      {toast.actionProps === undefined ? null : (
        <ToastPrimitive.Action
          className={buttonVariants({ tone: "default", size: "small" })}
        />
      )}
    </ToastPrimitive.Root>
  )
}

function Toaster(): ReactElement {
  const { toasts } = ToastPrimitive.useToastManager()
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport className="fixed top-s4 left-1/2 z-50 flex w-[min(var(--spacing-toast-max),calc(100%-2*var(--spacing-s5)))] -translate-x-1/2 flex-col gap-s3 outline-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  )
}

const useToast = ToastPrimitive.useToastManager

export { Toaster, ToastProvider, useToast }
