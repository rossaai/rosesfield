import { copyLocale, t } from "@/copy/t"

const dates = new Intl.DateTimeFormat(copyLocale, { dateStyle: "medium" })
const dateTimes = new Intl.DateTimeFormat(copyLocale, {
  dateStyle: "medium",
  timeStyle: "short",
})
const times = new Intl.DateTimeFormat(copyLocale, { timeStyle: "short" })
const choiceLocale = "en-GB"
const lists = new Intl.ListFormat(copyLocale, {
  style: "long",
  type: "conjunction",
})
const disjunctions = new Intl.ListFormat(choiceLocale, {
  style: "long",
  type: "disjunction",
})
const prices = new Intl.NumberFormat(copyLocale, {
  maximumFractionDigits: 0,
})
const smallEstimates = new Intl.NumberFormat(copyLocale, {
  maximumSignificantDigits: 2,
})
const estimates = new Intl.NumberFormat(copyLocale, {
  maximumFractionDigits: 1,
})
const tokenCounts = new Intl.NumberFormat(copyLocale, {
  maximumSignificantDigits: 3,
})
const seconds = new Intl.NumberFormat(copyLocale, { maximumFractionDigits: 1 })
const durations = new Intl.NumberFormat(copyLocale, {
  style: "unit",
  unit: "second",
  unitDisplay: "long",
  maximumFractionDigits: 0,
})
const numbers = new Intl.NumberFormat(copyLocale, { maximumFractionDigits: 2 })
const megabytes = new Intl.NumberFormat(copyLocale, {
  style: "unit",
  unit: "megabyte",
  maximumFractionDigits: 1,
})
const kilobytes = new Intl.NumberFormat(copyLocale, {
  style: "unit",
  unit: "kilobyte",
  maximumFractionDigits: 0,
})
const dayMs = 86_400_000

export function formatDate(iso: string): string {
  return dates.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return dateTimes.format(new Date(iso))
}

export function formatTime(iso: string): string {
  return times.format(new Date(iso))
}

export function formatList(items: readonly string[]): string {
  return lists.format(items)
}

export function formatChoices(items: readonly string[]): string {
  return disjunctions.format(items)
}

export function formatSeconds(value: number): string {
  return seconds.format(value)
}

export function formatDuration(seconds: number): string {
  return durations.format(seconds)
}

export function joinParts(parts: ReadonlyArray<string | null>): string {
  return parts.filter((part): part is string => part !== null).join(", ")
}

export function formatNumber(value: number): string {
  return numbers.format(value)
}

export function withUnit(value: number, unit: string): string {
  const number = formatNumber(value)
  if (unit === "") {
    return number
  }
  return /^\p{L}{2,}/u.test(unit) ? `${number} ${unit}` : `${number}${unit}`
}

export function formatAmount(amount: number): string {
  return amount > 0 && amount < 1 ? "<1" : prices.format(amount)
}

/** Writes credits as a whole number with the locale's thousands separator, and an amount over 0 and under 1 as 1. */
export function formatWholeCredits(credits: number): string {
  return prices.format(credits > 0 && credits < 1 ? 1 : credits)
}

/** Writes an estimate of credits with two significant figures under 1, one decimal under 10 and none from 10. */
export function formatEstimate(credits: number): string {
  if (credits < 1) {
    return smallEstimates.format(credits)
  }
  return credits < 10 ? estimates.format(credits) : prices.format(credits)
}

/** Writes a count of tokens in thousands or millions, binary when the count is a power-of-two multiple, such as 256K or 1M. */
export function formatTokenCount(tokens: number): string {
  const base = tokens % 1024 === 0 ? 1024 : 1000
  return tokens >= base * base
    ? `${tokenCounts.format(tokens / (base * base))}M`
    : `${tokenCounts.format(tokens / base)}K`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) {
    return kilobytes.format(Math.max(1, bytes / 1000))
  }
  return megabytes.format(bytes / 1_000_000)
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function dayKey(iso: string): number {
  return startOfDay(new Date(iso))
}

export function dayLabel(iso: string, now: Date): string {
  const days = Math.round((startOfDay(now) - dayKey(iso)) / dayMs)
  if (days === 0) {
    return t("library.day.today")
  }
  if (days === 1) {
    return t("library.day.yesterday")
  }
  return formatDate(iso)
}

export function secondsBetween(fromIso: string, toIso: string): number {
  return Math.max(0, (Date.parse(toIso) - Date.parse(fromIso)) / 1000)
}
