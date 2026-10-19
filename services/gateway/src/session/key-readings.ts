import { accountRoutes } from "#session/account.contract"
import type { KeyProbe, KeyReading } from "#session/key-probe"

export class KeyReadings {
  private readonly probe: KeyProbe
  private readonly started = new WeakMap<Request, Promise<KeyReading>>()

  constructor(options: { probe: KeyProbe }) {
    this.probe = options.probe
  }

  start(request: Request, key: string): void {
    const route = accountRoutes.getAccount
    if (
      request.method === route.method &&
      new URL(request.url).pathname === route.path
    ) {
      this.started.set(request, this.probe.read(key))
    }
  }

  take(request: Request, key: string): Promise<KeyReading> {
    return this.started.get(request) ?? this.probe.read(key)
  }
}
