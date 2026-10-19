import type { Clock } from "@rosesfield/kernel"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
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
  static readonly retryMs = 300_000
  static readonly concurrency = 32
  static readonly maxPages = 20
  static readonly maxKeys = 1000

  private readonly clock: Clock
  private readonly maxAgeMs: number
  private readonly concurrency: number
  private readonly entries = new Map<string, CatalogEntry>()
  private readonly misses = new Map<string, number>()
  private readonly listings = new Map<string, Listing>()
  private readonly loads = new Map<string, Promise<void>>()
  private readonly offEstimates = new Map<string, number>()
  private readonly kept = new Map<string, KeptResult & { at: number }>()
  private rates: Stored | null = null

  constructor(options: RouterCatalogOptions) {
    this.clock = options.clock
    this.maxAgeMs = options.maxAgeMs ?? RouterCatalog.maxAgeMs
    this.concurrency = options.concurrency ?? RouterCatalog.concurrency
  }

  async models(http: RouterHttp): Promise<CatalogEntry[]> {
    const tag = await http.keyTag()
    if (this.needsLoad(tag)) {
      await this.loadOnce(http, tag)
    }
    return this.listedIds(tag).flatMap((id) => {
      const entry = this.entries.get(id)
      return entry === undefined || entry.facts.aliasOf !== null ? [] : [entry]
    })
  }

  async entry(http: RouterHttp, model: string): Promise<CatalogEntry | null> {
    await this.models(http)
    if (!this.listedIds(await http.keyTag()).includes(model)) {
      return null
    }
    const held = this.entries.get(model)
    if (held?.source === "public" && http.hasKey) {
      await this.refresh(http, model).catch(() => undefined)
    }
    return this.entries.get(model) ?? null
  }

  async idle(): Promise<void> {
    await Promise.allSettled([...this.loads.values()])
  }

  async rateRows(http: RouterHttp): Promise<readonly RateRow[]> {
    const held = this.rates
    if (held !== null && this.isFresh(held.checkedAt)) {
      return held.rows
    }
    const rows = rateRowsOf(await http.readRates())
    this.rates = { rows, checkedAt: this.now() }
    return rows
  }

  keepResult(ref: string, result: KeptResult): void {
    for (const [held, one] of this.kept) {
      if (!this.isFresh(one.at)) {
        this.kept.delete(held)
      }
    }
    this.kept.set(ref, { ...result, at: this.now() })
  }

  keptResult(ref: string): KeptResult | null {
    return this.kept.get(ref) ?? null
  }

  hasEstimates(keyTag: string): boolean {
    const off = this.offEstimates.get(keyTag)
    return off === undefined || !this.isFresh(off)
  }

  markEstimatesOff(keyTag: string): void {
    this.remember(this.offEstimates, keyTag, this.now(), (at) => at)
  }

  private listedIds(tag: string): readonly string[] {
    return this.listings.get(tag)?.ids ?? []
  }

  private needsLoad(tag: string): boolean {
    const listing = this.listings.get(tag)
    if (listing === undefined || !this.isFresh(listing.checkedAt)) {
      return true
    }
    return listing.ids.some((id) => this.isDue(id))
  }

  private isDue(id: string): boolean {
    const entry = this.entries.get(id)
    if (entry !== undefined && this.isFresh(entry.checkedAt)) {
      return false
    }
    const missed = this.misses.get(id)
    return missed === undefined || this.now() - missed >= RouterCatalog.retryMs
  }

  private loadOnce(http: RouterHttp, tag: string): Promise<void> {
    const running = this.loads.get(tag)
    if (running !== undefined) {
      return running
    }
    const earlier = [...this.loads.values()]
    const load = this.load(http, tag, earlier).finally(() => {
      this.loads.delete(tag)
    })
    this.loads.set(tag, load)
    return load
  }

  private async load(
    http: RouterHttp,
    tag: string,
    earlier: readonly Promise<void>[]
  ): Promise<void> {
    const ids = await this.listingOf(http, tag)
    await Promise.allSettled(earlier)
    const due = ids.filter((id) => this.isDue(id))
    const failures: unknown[] = []
    await this.inBatches(due, (id) =>
      this.refresh(http, id).catch((error: unknown) => {
        failures.push(error)
        this.misses.set(id, this.now())
      })
    )
    const [first] = failures
    if (first !== undefined && ids.every((id) => !this.entries.has(id))) {
      for (const id of due) {
        this.misses.delete(id)
      }
      throw first
    }
  }

  private async listingOf(
    http: RouterHttp,
    tag: string
  ): Promise<readonly string[]> {
    const held = this.listings.get(tag)
    if (held !== undefined && this.isFresh(held.checkedAt)) {
      return held.ids
    }
    try {
      const ids = await this.readIds(http)
      this.remember(this.listings, tag, { ids, checkedAt: this.now() }, at)
      return ids
    } catch (error) {
      if (held === undefined || !(error instanceof EngineUnavailableError)) {
        this.listings.delete(tag)
        throw error
      }
      const retryAt = this.now() - this.maxAgeMs + RouterCatalog.retryMs
      this.listings.set(tag, { ids: held.ids, checkedAt: retryAt })
      return held.ids
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
    if (!http.hasKey) {
      this.store(id, await http.readPublicSchema(id), null, "public")
      return
    }
    const held = this.entries.get(id)
    const etag = held?.source === "keyed" ? held.etag : null
    const read = await http.readSchema(id, etag)
    if (read.state === "same" && held !== undefined) {
      this.entries.set(id, { ...held, checkedAt: this.now() })
      this.misses.delete(id)
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
      this.misses.set(id, this.now())
      return
    }
    this.misses.delete(id)
    this.entries.set(id, {
      facts,
      form: { model: id, fields: fieldsOf(facts) },
      etag,
      checkedAt: this.now(),
      source,
    })
  }

  private remember<T>(
    map: Map<string, T>,
    tag: string,
    value: T,
    atOf: (value: T) => number
  ): void {
    for (const [held, one] of map) {
      if (!this.isFresh(atOf(one))) {
        map.delete(held)
      }
    }
    map.delete(tag)
    map.set(tag, value)
    for (const held of map.keys()) {
      if (map.size <= RouterCatalog.maxKeys) {
        break
      }
      map.delete(held)
    }
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

  private isFresh(checkedAt: number): boolean {
    return this.now() - checkedAt < this.maxAgeMs
  }

  private now(): number {
    return this.clock.now().getTime()
  }
}

function at(listing: Listing): number {
  return listing.checkedAt
}
