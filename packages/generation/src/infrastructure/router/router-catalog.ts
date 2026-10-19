import type { Clock } from "@rosesfield/kernel"
import type { ModelForm } from "#domain/model-form"
import { fieldsOf } from "#infrastructure/router/router-fields"
import type { RouterHttp } from "#infrastructure/router/router-http"
import { type RateRow, rateRowsOf } from "#infrastructure/router/router-rates"
import { factsOf, type SchemaFacts } from "#infrastructure/router/router-schema"

export type CatalogSource = "keyed" | "public"

export type CatalogEntry = {
  facts: SchemaFacts
  form: ModelForm
  etag: string | null
  checkedAt: number
  source: CatalogSource
}

type Listing = {
  ids: readonly string[]
  checkedAt: number
  source: CatalogSource
}

type Stored = {
  rows: readonly RateRow[]
  checkedAt: number
}

export type KeptResult = {
  bytes: Uint8Array
  contentType: string | null
  credits: number | null
}

type RouterCatalogOptions = {
  clock: Clock
  maxAgeMs?: number
  concurrency?: number
}

export class RouterCatalog {
  static readonly maxAgeMs = 3_600_000
  static readonly concurrency = 32
  static readonly maxPages = 20

  private readonly clock: Clock
  private readonly maxAgeMs: number
  private readonly concurrency: number
  private readonly entries = new Map<string, CatalogEntry>()
  private listing: Listing | null = null
  private rates: Stored | null = null
  private loading: Promise<void> | null = null
  private readonly offEstimates = new Set<string>()
  private readonly kept = new Map<string, KeptResult & { at: number }>()

  constructor(options: RouterCatalogOptions) {
    this.clock = options.clock
    this.maxAgeMs = options.maxAgeMs ?? RouterCatalog.maxAgeMs
    this.concurrency = options.concurrency ?? RouterCatalog.concurrency
  }

  async models(http: RouterHttp): Promise<CatalogEntry[]> {
    if (this.listing === null) {
      await this.loadOnce(http)
    } else if (this.needsLoad(http)) {
      this.loadOnce(http).catch(() => undefined)
    }
    return (this.listing?.ids ?? []).flatMap((id) => {
      const entry = this.entries.get(id)
      return entry === undefined || entry.facts.aliasOf !== null ? [] : [entry]
    })
  }

  async entry(http: RouterHttp, model: string): Promise<CatalogEntry | null> {
    await this.models(http)
    return this.entries.get(model) ?? null
  }

  async idle(): Promise<void> {
    await this.loading?.catch(() => undefined)
  }

  private loadOnce(http: RouterHttp): Promise<void> {
    this.loading ??= this.load(http).finally(() => {
      this.loading = null
    })
    return this.loading
  }

  async rateRows(http: RouterHttp): Promise<readonly RateRow[]> {
    const held = this.rates
    if (held !== null && this.ageOf(held.checkedAt) < this.maxAgeMs) {
      return held.rows
    }
    const rows = rateRowsOf(await http.readRates())
    this.rates = { rows, checkedAt: this.now() }
    return rows
  }

  keepResult(ref: string, result: KeptResult): void {
    for (const [held, one] of this.kept) {
      if (this.ageOf(one.at) >= this.maxAgeMs) {
        this.kept.delete(held)
      }
    }
    this.kept.set(ref, { ...result, at: this.now() })
  }

  keptResult(ref: string): KeptResult | null {
    return this.kept.get(ref) ?? null
  }

  hasEstimates(keyTag: string): boolean {
    return !this.offEstimates.has(keyTag)
  }

  markEstimatesOff(keyTag: string): void {
    this.offEstimates.add(keyTag)
  }

  private needsLoad(http: RouterHttp): boolean {
    const { listing } = this
    if (listing === null || this.ageOf(listing.checkedAt) >= this.maxAgeMs) {
      return true
    }
    if (http.hasKey && listing.source === "public") {
      return true
    }
    return listing.ids.some((id) => {
      const entry = this.entries.get(id)
      return entry === undefined || this.isStale(entry, http)
    })
  }

  private isStale(entry: CatalogEntry, http: RouterHttp): boolean {
    return (
      this.ageOf(entry.checkedAt) >= this.maxAgeMs ||
      (http.hasKey && entry.source === "public")
    )
  }

  private async load(http: RouterHttp): Promise<void> {
    const source: CatalogSource = http.hasKey ? "keyed" : "public"
    const listing = this.listing
    const ids =
      listing === null ||
      this.ageOf(listing.checkedAt) >= this.maxAgeMs ||
      listing.source !== source
        ? await this.readIds(http)
        : listing.ids
    this.listing = { ids, checkedAt: this.now(), source }
    const due = ids.filter((id) => {
      const entry = this.entries.get(id)
      return entry === undefined || this.isStale(entry, http)
    })
    const failures: unknown[] = []
    await this.inBatches(due, (id) =>
      this.refresh(http, id).catch((error: unknown) => {
        failures.push(error)
      })
    )
    const [first] = failures
    if (first !== undefined && ids.every((id) => !this.entries.has(id))) {
      this.listing = null
      throw first
    }
  }

  private async readIds(http: RouterHttp): Promise<string[]> {
    if (!http.hasKey) {
      return http.readPublicIndex()
    }
    const ids: string[] = []
    let cursor: string | null = null
    for (let page = 0; page < RouterCatalog.maxPages; page += 1) {
      const read = await http.listPage(cursor)
      ids.push(...read.ids)
      if (read.next === null || read.ids.length === 0) {
        break
      }
      cursor = read.next
    }
    return ids
  }

  private async refresh(http: RouterHttp, id: string): Promise<void> {
    const held = this.entries.get(id)
    if (!http.hasKey) {
      this.store(id, await http.readPublicSchema(id), null, "public")
      return
    }
    const etag = held?.source === "keyed" ? held.etag : null
    const read = await http.readSchema(id, etag)
    if (read.state === "same" && held !== undefined) {
      this.entries.set(id, { ...held, checkedAt: this.now() })
    } else if (read.state === "fresh") {
      this.store(id, read.document, read.etag, "keyed")
    }
  }

  private store(
    id: string,
    document: unknown,
    etag: string | null,
    source: CatalogSource
  ): void {
    const facts = factsOf(document)
    if (facts === null || facts.model !== id) {
      return
    }
    this.entries.set(id, {
      facts,
      form: { model: id, fields: fieldsOf(facts) },
      etag,
      checkedAt: this.now(),
      source,
    })
  }

  private async inBatches(
    ids: readonly string[],
    work: (id: string) => Promise<void>
  ): Promise<void> {
    const queue = [...ids]
    const workers = Array.from(
      { length: Math.min(this.concurrency, queue.length) },
      async () => {
        for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
          await work(id)
        }
      }
    )
    await Promise.all(workers)
  }

  private ageOf(checkedAt: number): number {
    return this.now() - checkedAt
  }

  private now(): number {
    return this.clock.now().getTime()
  }
}
