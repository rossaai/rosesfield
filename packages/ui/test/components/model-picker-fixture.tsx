import { Chip } from "@rosesfield/ui/components/chip"
import {
  ModelPicker,
  type ModelPickerProps,
  type ModelPickerRow,
  type ModelPickerWords,
} from "@rosesfield/ui/components/model-picker"
import { render, screen } from "@testing-library/react"

export const words: ModelPickerWords = {
  title: "Model",
  search: "Search models",
  searchPlaceholder: "Search by name or maker",
  empty: "No model matches",
  sortFilter: "Sort and filter",
  sortBy: "Sort by",
  sortRank: "Rank",
  sortPrice: "Price",
  order: "Order",
  orderDown: "High to low",
  orderUp: "Low to high",
  openOnly: "Open weights only",
  featured: "Featured",
  all: "All models",
}

export function rowOf(
  id: string,
  change: Partial<ModelPickerRow> = {}
): ModelPickerRow {
  return {
    id,
    name: id.toUpperCase(),
    keywords: [],
    badges: [],
    capabilities: [],
    ...change,
  }
}

export function priceOf(credits: number): NonNullable<ModelPickerRow["price"]> {
  return { amount: String(credits), name: `${credits} credits`, credits }
}

export const openBadge = {
  kind: "openWeights",
  label: "Open weights",
  href: "https://huggingface.co/lab/model",
} as const

export function openPicker(
  change: Partial<ModelPickerProps> & Pick<ModelPickerProps, "rows">
): void {
  render(
    <ModelPicker
      trigger={<Chip>Model</Chip>}
      words={words}
      chosen={null}
      onChoose={() => undefined}
      open
      {...change}
    />
  )
}

export function shownIds(section: "featured" | "all" = "all"): string[] {
  return screen
    .queryAllByRole("option")
    .filter(
      (one) =>
        one
          .closest("[data-slot='model-list-section']")
          ?.getAttribute("data-section") === section
    )
    .map((row) => row.dataset.model ?? "")
}

export function sectionIds(): string[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      "[data-slot='model-list-section']"
    ),
  ].map((one) => one.dataset.section ?? "")
}

export function rowElementOf(name: string, section = "all"): HTMLElement {
  const row = screen
    .getAllByRole("option", { name })
    .find(
      (one) =>
        one
          .closest("[data-slot='model-list-section']")
          ?.getAttribute("data-section") === section
    )
    ?.closest<HTMLElement>("[data-slot='model-row']")
  if (row === null || row === undefined) {
    throw new Error(`no row for ${name}`)
  }
  return row
}
