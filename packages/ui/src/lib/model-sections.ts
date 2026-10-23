import type { ModelPickerRow } from "@rosesfield/ui/components/model-row"

type ModelPickerSection = {
  id: string
  label: string
  rows: readonly ModelPickerRow[]
}

type ModelPickerFilter = "featured" | "top" | "newest" | "open"

type ModelPickerFilters = Record<ModelPickerFilter, string>

export const featuredId = "featured"

function rowsOf(sections: readonly ModelPickerSection[]): ModelPickerRow[] {
  const seen = new Set<string>()
  return sections.flatMap((section) =>
    section.rows.filter((row) => !seen.has(row.id) && seen.add(row.id) !== null)
  )
}

function filteredSections(
  sections: readonly ModelPickerSection[],
  filter: ModelPickerFilter,
  labels: ModelPickerFilters | undefined
): ModelPickerSection[] {
  if (filter === "featured" || labels === undefined) {
    return labSectionsOf(sections)
  }
  const rows = rowsOf(sections)
  if (filter === "open") {
    return labSectionsOf([
      {
        id: "open",
        label: labels.open,
        rows: rows.filter((row) => row.isOpen),
      },
    ])
  }
  if (filter === "top") {
    const ranked = rows.filter((row) => row.rank !== undefined)
    ranked.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    return [{ id: "top", label: labels.top, rows: ranked }]
  }
  const dated = rows.filter((row) => row.released !== undefined)
  dated.sort((a, b) => (b.released ?? "").localeCompare(a.released ?? ""))
  return [{ id: "newest", label: labels.newest, rows: dated }]
}

function hasFilter(
  sections: readonly ModelPickerSection[],
  filter: ModelPickerFilter
): boolean {
  const rows = rowsOf(sections)
  switch (filter) {
    case "featured":
      return true
    case "top":
      return rows.some((row) => row.rank !== undefined)
    case "newest":
      return rows.some((row) => row.released !== undefined)
    case "open":
      return rows.some((row) => row.isOpen === true)
  }
}

function labOf(row: ModelPickerRow): string {
  return row.lab ?? row.maker
}

function matches(row: ModelPickerRow, query: string): boolean {
  const needle = query.trim().toLowerCase()
  return (
    needle === "" ||
    row.name.toLowerCase().includes(needle) ||
    row.maker.toLowerCase().includes(needle) ||
    labOf(row).toLowerCase().includes(needle)
  )
}

function labSectionsOf(
  sections: readonly ModelPickerSection[]
): ModelPickerSection[] {
  const featured = sections.filter((section) => section.id === featuredId)
  const seen = new Set<string>(
    featured.flatMap((section) => section.rows.map((row) => row.id))
  )
  const byLab = new Map<string, ModelPickerRow[]>()
  for (const section of sections) {
    if (section.id === featuredId) {
      continue
    }
    for (const row of section.rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id)
        byLab.set(labOf(row), [...(byLab.get(labOf(row)) ?? []), row])
      }
    }
  }
  const labs = [...byLab.entries()].sort(([a], [b]) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  )
  return [
    ...featured,
    ...labs.map(([lab, rows]) => ({ id: `lab:${lab}`, label: lab, rows })),
  ]
}

function filterSections(
  sections: readonly ModelPickerSection[],
  query: string
): ModelPickerSection[] {
  return sections
    .map((section) => ({
      ...section,
      rows: section.rows.filter((row) => matches(row, query)),
    }))
    .filter((section) => section.rows.length > 0)
}

export type { ModelPickerFilter, ModelPickerFilters, ModelPickerSection }
export { filteredSections, filterSections, hasFilter, labSectionsOf }
