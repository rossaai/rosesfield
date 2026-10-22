import type { TimerJobRunner } from "@rosesfield/generation"
import type { Built } from "#build-handlers"
import { ownerScope } from "#compose/request-scope"
import { visitorSettings } from "#compose/settings"
import { comfyCloudUrl, type EngineSettings } from "#engine/engine-target"
import type { WorkerVars } from "#env"
import type { GatewayContext } from "#gateway"
import type { RequestScope } from "#gateway-env"
import { readVisitorKeys } from "#session/visitor-keys"

type PastedKeysOptions = {
  vars: WorkerVars
  build: (key: string) => Built<TimerJobRunner>
}

export class PastedKeys {
  static readonly engine: EngineSettings = {
    target: "comfy-cloud",
    baseUrl: comfyCloudUrl,
    apiKey: null,
  }

  private readonly vars: WorkerVars
  private readonly build: (key: string) => Built<TimerJobRunner>
  private readonly built = new Map<string, Built<TimerJobRunner>>()
  private resume: "due" | "done" = "due"

  constructor(options: PastedKeysOptions) {
    this.vars = options.vars
    this.build = options.build
  }

  scopeFor(
    keyless: RequestScope
  ): (c: GatewayContext) => Promise<RequestScope> {
    return async (c) => {
      const key = readVisitorKeys(c).engine
      if (key === null) {
        return keyless
      }
      const { handlers } = await this.handlersOf(key)
      return ownerScope({
        handlers,
        agent: null,
        settings: visitorSettings(
          { ...this.vars, engine: PastedKeys.engine },
          { engine: key },
          "bun"
        ),
      })
    }
  }

  async handlersOf(key: string): Promise<Built<TimerJobRunner>> {
    const found = this.built.get(key)
    if (found !== undefined) {
      return found
    }
    const made = this.build(key)
    this.built.set(key, made)
    if (this.resume === "due") {
      this.resume = "done"
      await made.jobs.resume()
    }
    return made
  }

  stop(): void {
    for (const { jobs } of this.built.values()) {
      jobs.stop()
    }
    this.built.clear()
  }
}
