import type { Clock } from "@rosesfield/kernel"
import { EngineUnavailableError } from "#domain/error/engine-unavailable.error"
import {
  type CatalogDatabase,
  DrizzleRouterCatalogStore,
  type KeptListing,
  type KeptSchema,
} from "#infrastructure/router/drizzle-router-catalog-store"
import { type CatalogEntry, entryOf } from "#infrastructure/router/router-entry"
import type { RouterHttp } from "#infrastructure/router/router-http"
import { type RateRow, rateRowsOf } from "#infrastructure/router/router-rates"

type Stored = {
  rows: readonly RateRow[]
  checkedAt: number
}

type Load = {
  whole: Promise<void>
  done: Promise<void>
}

type RouterCatalogOptions = {
  clock: Clock
  maxAgeMs?: number
  concurrency?: number
  db?: CatalogDatabase
  defer?: (work: Promise<void>) => void
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
  private readonly kept: DrizzleRouterCatalogStore | null
  private readonly defer: (work: Promise<void>) => void
  private readonly entries = new Map<string, CatalogEntry>()
  private readonly misses = new Map<string, number>()
  private readonly listings = new Map<string, KeptListing>()
  private readonly loads = new Map<string, Load>()
  private readonly restores = new Map<string, Promise<void>>()
  private readonly reads = new Map<string, number>()
  private readonly offEstimates = new Map<string, number>()
  private rates: Stored | null = null

  constructor(options: RouterCatalogOptions) {
    this.clock = options.clock
    this.maxAgeMs = options.maxAgeMs ?? RouterCatalog.maxAgeMs
    this.concurrency = options.concurrency ?? RouterCatalog.concurrency
    this.kept =
      options.db === undefined
        ? null
        : new DrizzleRouterCatalogStore({ db: options.db })
    this.defer = options.defer ?? (() => undefined)
  }

  static forgetUnread(db: CatalogDatabase, before: number): Promise<number> {
    return new DrizzleRouterCatalogStore({ db }).forgetUnread(before)
  }

  async models(http: RouterHttp): Promise<CatalogEntry[]> {
    const tag = await http.keyTag()
    if (!this.listings.has(tag)) {
      await this.restoreOnce(tag)
    }
    if (this.needsLoad(tag)) {
      const load = this.loadOnce(http, tag)
      this.defer(load.done.catch(() => undefined))
      if (!this.isWhole(tag)) {
        await load.whole
      }
    }
    this.markRead(tag)
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
    const loads = [...this.loads.values()].map((load) => load.done)
    const running = [...this.restores.values(), ...loads]
    await Promise.allSettled(running)
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

  private isWhole(tag: string): boolean {
    const ids = this.listings.get(tag)?.ids
    const isRead = (id: string): boolean =>
      this.entries.has(id) || this.misses.has(id)
    return ids?.every(isRead) ?? false
  }

  private restoreOnce(tag: string): Promise<void> {
    return this.once(this.restores, tag, () =>
      this.restore(tag).catch(() => undefined)
    )
  }

  private async restore(tag: string): Promise<void> {
    if (this.kept === null) {
      return
    }
    const listing = await this.kept.listing(tag)
    if (listing === null || this.listings.has(tag)) {
      return
    }
    const missing = listing.ids.filter((id) => !this.entries.has(id))
    for (const schema of await this.kept.schemas(missing)) {
      this.restoreEntry(schema)
    }
    if (!this.listings.has(tag)) {
      this.hold(this.listings, tag, listing)
      this.reads.delete(tag)
    }
  }

  private restoreEntry(schema: KeptSchema): void {
    const held = this.entries.get(schema.model)
    if (held !== undefined && held.checkedAt >= schema.checkedAt) {
      return
    }
    const entry = entryOf(schema)
    if (entry !== null) {
      this.entries.set(schema.model, entry)
    }
  }

  private markRead(tag: string): void {
    const read = this.reads.get(tag)
    if (!this.listings.has(tag) || (read !== undefined && this.isFresh(read))) {
      return
    }
    const now = this.now()
    this.remember(this.reads, tag, now, (at) => at)
    this.defer(this.keep((kept) => kept.markRead(tag, now)))
  }

  private async keep(
    work: (kept: DrizzleRouterCatalogStore) => Promise<void>
  ): Promise<void> {
    if (this.kept !== null) {
      await work(this.kept).catch(() => undefined)
    }
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

  private loadOnce(http: RouterHttp, tag: string): Load {
    const held = this.loads.get(tag)
    if (held !== undefined) {
      return held
    }
    const earlier = [...this.loads.values()].map((load) => load.done)
    const whole = this.load(http, tag, earlier)
    const done = whole
      .then(() => this.revalidate(http, tag))
      .finally(() => {
        this.loads.delete(tag)
      })
    const load = { whole, done }
    this.loads.set(tag, load)
    return load
  }

  private once(
    running: Map<string, Promise<void>>,
    tag: string,
    start: () => Promise<void>
  ): Promise<void> {
    const held = running.get(tag)
    if (held !== undefined) {
      return held
    }
    const work = start().finally(() => {
      running.delete(tag)
    })
    running.set(tag, work)
    return work
  }

  private async load(
    http: RouterHttp,
    tag: string,
    earlier: readonly Promise<void>[]
  ): Promise<void> {
    const ids = await this.listingOf(http, tag)
    await Promise.allSettled(earlier)
    const unheld = ids.filter((id) => !this.entries.has(id) && this.isDue(id))
    const failures: unknown[] = []
    await this.readEach(http, unheld, failures)
    const [first] = failures
    if (first !== undefined && ids.every((id) => !this.entries.has(id))) {
      for (const id of unheld) {
        this.misses.delete(id)
      }
      throw first
    }
  }

  private revalidate(http: RouterHttp, tag: string): Promise<void> {
    const due = this.listedIds(tag).filter((id) => this.isDue(id))
    return this.readEach(http, due, [])
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
      const listing = { ids, checkedAt: this.now() }
      this.hold(this.listings, tag, listing)
      this.remember(this.reads, tag, listing.checkedAt, (read) => read)
      await this.keep((kept) => kept.keepListing(tag, listing))
      return ids
    } catch (error) {
      if (held === undefined || !(error instanceof EngineUnavailableError)) {
        this.listings.delete(tag)
        await this.keep((kept) => kept.forgetListing(tag))
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
      const document = await http.readPublicSchema(id)
      await this.store({ model: id, document, etag: null, source: "public" })
      return
    }
    const held = this.entries.get(id)
    const etag = held?.source === "keyed" ? held.etag : null
    const read = await http.readSchema(id, etag)
    if (read.state === "same" && held !== undefined) {
      const checkedAt = this.now()
      this.entries.set(id, { ...held, checkedAt })
      this.misses.delete(id)
      await this.keep((kept) => kept.markChecked(id, checkedAt))
    } else if (read.state === "fresh") {
      const { document, etag: next } = read
      await this.store({ model: id, document, etag: next, source: "keyed" })
    }
  }

  private async store(read: Omit<KeptSchema, "checkedAt">): Promise<void> {
    const schema = { ...read, checkedAt: this.now() }
    const entry = entryOf(schema)
    if (entry === null) {
      this.misses.set(read.model, this.now())
      return
    }
    this.misses.delete(read.model)
    this.entries.set(read.model, entry)
    await this.keep((kept) => kept.keepSchema(schema))
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
    this.hold(map, tag, value)
  }

  private hold<T>(map: Map<string, T>, tag: string, value: T): void {
    map.delete(tag)
    map.set(tag, value)
    for (const held of map.keys()) {
      if (map.size <= RouterCatalog.maxKeys) {
        break
      }
      map.delete(held)
    }
  }

  private async readEach(
    http: RouterHttp,
    ids: readonly string[],
    failures: unknown[]
  ): Promise<void> {
    const queue = [...ids]
    const read = async (): Promise<void> => {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        await this.refresh(http, id).catch((error: unknown) => {
          failures.push(error)
          this.misses.set(id, this.now())
        })
      }
    }
    const count = Math.min(this.concurrency, queue.length)
    await Promise.all(Array.from({ length: count }, read))
  }

  private isFresh(checkedAt: number): boolean {
    return this.now() - checkedAt < this.maxAgeMs
  }

  private now(): number {
    return this.clock.now().getTime()
  }
}
