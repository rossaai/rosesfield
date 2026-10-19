type KeptValuesOptions = {
  database: string
  store: string
}

export class KeptValues {
  private readonly database: string
  private readonly store: string

  constructor(options: KeptValuesOptions) {
    this.database = options.database
    this.store = options.store
  }

  async read(key: string): Promise<string | null> {
    const found = await this.withStore("readonly", (store) => store.get(key))
    return typeof found === "string" && found !== "" ? found : null
  }

  async write(key: string, value: string): Promise<void> {
    await this.withStore("readwrite", (store) => store.put(value, key))
  }

  async remove(key: string): Promise<void> {
    await this.withStore("readwrite", (store) => store.delete(key))
  }

  private open(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === "undefined") {
      return Promise.resolve(null)
    }
    return new Promise((resolve) => {
      const request = indexedDB.open(this.database, 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore(this.store)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
    })
  }

  private async withStore<Result>(
    mode: IDBTransactionMode,
    act: (store: IDBObjectStore) => IDBRequest<Result>
  ): Promise<Result | null> {
    const database = await this.open()
    if (database === null) {
      return null
    }
    return new Promise((resolve) => {
      const transaction = database.transaction(this.store, mode)
      const request = act(transaction.objectStore(this.store))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(null)
      transaction.oncomplete = () => database.close()
    })
  }
}
