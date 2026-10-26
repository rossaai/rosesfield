import type { TimerJobRunner } from "@rosesfield/generation"
import type { KeyedAgent } from "#agent/keyed-agent"
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
  agent: (() => KeyedAgent) | null
}

export class PastedKeys {
  static readonly engine: EngineSettings = {
    target: "comfy-cloud",
    baseUrl: comfyCloudUrl,
    apiKey: null,
  }

  private readonly vars: WorkerVars
  private readonly build: (key: string) => Built<TimerJobRunner>
  private readonly makeAgent: (() => KeyedAgent) | null
  private readonly agents = new Map<string, KeyedAgent>()
  private readonly built = new Map<string, Built<TimerJobRunner>>()
  private resume: "due" | "done" = "due"

  constructor(options: PastedKeysOptions) {
    this.vars = options.vars
    this.build = options.build
    this.makeAgent = options.agent
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
      const agent = this.agentOf(key)
      return ownerScope({
        handlers,
        agent: agent?.agent ?? null,
        settings: visitorSettings(
          {
            ...this.vars,
            engine: PastedKeys.engine,
            agent: agent?.model ?? null,
          },
          { engine: key },
          "bun"
        ),
        ...(agent === null
          ? {}
          : { hold: () => agent.hold({ handlers, modelKey: key }) }),
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

  agentOf(key: string): KeyedAgent | null {
    const found = this.agents.get(key)
    if (found !== undefined || this.makeAgent === null) {
      return found ?? null
    }
    const made = this.makeAgent()
    this.agents.set(key, made)
    return made
  }

  async stop(): Promise<void> {
    for (const { jobs } of this.built.values()) {
      jobs.stop()
    }
    this.built.clear()
    const agents = [...this.agents.values()]
    this.agents.clear()
    await Promise.all(agents.map((agent) => agent.close()))
  }
}
