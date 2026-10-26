import { TooltipProvider } from "@rosesfield/ui/components/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import type { ReactElement } from "react"
import { t } from "@/copy/t"
import type { FormValues } from "@/screens/app/app-form"
import type { AppForm } from "@/screens/app/use-app-form"

export function formOf(values: FormValues): AppForm {
  return {
    values,
    problems: new Map(),
    setInput: () => undefined,
    setForm: () => undefined,
    fill: () => undefined,
    validate: () => true,
    register: () => undefined,
  }
}

export function showColumn(node: ReactElement): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{node}</TooltipProvider>
    </QueryClientProvider>
  )
}

export function isBefore(first: Element, second: Element): boolean {
  return (
    (first.compareDocumentPosition(second) &
      Node.DOCUMENT_POSITION_FOLLOWING) !==
    0
  )
}

export function modelChips(): HTMLElement[] {
  return screen.queryAllByRole("button", {
    name: new RegExp(`^${t("model.picker.title")} `),
  })
}

export function theModelChip(): HTMLElement {
  const [only, ...more] = modelChips()
  if (only === undefined || more.length > 0) {
    throw new Error(`expected one model chip, found ${modelChips().length}`)
  }
  return only
}

export function advancedToggle(): HTMLElement {
  return screen.getByRole("button", { name: t("field.advanced") })
}

export function captionOf(text: string): HTMLElement {
  return screen.getByText(text, { selector: "[data-slot='field-caption'] *" })
}
