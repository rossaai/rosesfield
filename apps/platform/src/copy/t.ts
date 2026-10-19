import { catalogCopy } from "@/catalog/catalog-copy"
import { type CopyKey, copy } from "@/copy.en"

export type CopyValues = Readonly<Record<string, string | number>>

type PluralBase = {
  [Key in CopyKey]: Key extends `${infer Base}.one` ? Base : never
}[CopyKey]

const locale = "en"
const numbers = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
const plurals = new Intl.PluralRules(locale)
const platformCopy: Readonly<Record<string, string>> = copy

function fill(text: string, values: CopyValues | undefined): string {
  if (values === undefined) {
    return text
  }
  return text.replace(/\{(\w+)\}/g, (match: string, name: string) => {
    const value = values[name]
    if (value === undefined) {
      return match
    }
    return typeof value === "number" ? numbers.format(value) : value
  })
}

export function t(key: CopyKey, values?: CopyValues): string {
  return fill(copy[key], values)
}

export function tCount(
  base: PluralBase,
  count: number,
  values?: CopyValues
): string {
  const form = plurals.select(count) === "one" ? "one" : "other"
  const key: `${PluralBase}.${"one" | "other"}` = `${base}.${form}`
  return fill(copy[key], { count, ...values })
}

export function hasCatalogText(key: string): boolean {
  return Object.hasOwn(catalogCopy, key) || Object.hasOwn(platformCopy, key)
}

export function tCatalog(key: string, values?: CopyValues): string {
  const text = catalogCopy[key] ?? platformCopy[key] ?? key
  return fill(text, values)
}

export const copyLocale = locale
