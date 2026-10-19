import type { Run } from "@rosesfield/contract"
import { useToast } from "@rosesfield/ui/components/toast"
import { runWorkflow } from "@/catalog/app-workflows"
import { workflowFileLoader } from "@/catalog/workflow-files"
import { t } from "@/copy/t"
import { useDevice } from "@/device/device-context"

const workflowType = "application/json"

export function useOpenInComfy(run: Run | null): (() => void) | null {
  const device = useDevice()
  const toast = useToast()
  const workflow = run === null ? null : runWorkflow(run)
  const load = workflow === null ? null : workflowFileLoader(workflow)
  if (workflow === null || load === null) {
    return null
  }
  const save = async (): Promise<void> => {
    const response = await fetch(await load())
    if (!response.ok) {
      throw new Error(`workflow file answered ${response.status}`)
    }
    const bytes = await response.arrayBuffer()
    await device.save({
      name: `${workflow.id}.json`,
      blob: new Blob([bytes], { type: workflowType }),
    })
  }
  return () => {
    save().catch(() => {
      toast.add({ title: t("run.openInComfy.failed") })
    })
  }
}
