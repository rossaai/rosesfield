import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs"
import { join } from "node:path"
import {
  type AgentModel,
  type OpenPiModelsOptions,
  type PiAgentHarness,
  routerAgentHarness,
} from "@rosesfield/agent"
import { openSqliteFileStorage } from "@rosesfield/agent/local"
import type { AppDefinition } from "@rosesfield/contract"
import type { Clock } from "@rosesfield/kernel"
import { AgentAccess, type AgentRequest } from "#agent/agent-access"
import { isSessionId } from "#session/session-cookie"
import type { SessionId } from "#session/session-scope"

type SessionAgentsOptions = {
  folder: string
  model: AgentModel
  apps: readonly AppDefinition[]
  clock: Clock
  modelOptions?: OpenPiModelsOptions
}

type OpenAgent = {
  agent: PiAgentHarness
  access: AgentAccess
  idle: ReturnType<typeof setTimeout> | null
}

export class SessionAgents {
  static readonly idleMs = 60_000
  static readonly fileSuffix = ".db"
  static readonly fileParts = ["", "-wal", "-shm"]
  static readonly copiedParts = ["", "-wal"]

  private readonly folder: string
  private readonly model: AgentModel
  private readonly apps: readonly AppDefinition[]
  private readonly clock: Clock
  private readonly modelOptions: OpenPiModelsOptions
  private readonly open = new Map<SessionId, OpenAgent>()

  constructor(options: SessionAgentsOptions) {
    this.folder = options.folder
    this.model = options.model
    this.apps = options.apps
    this.clock = options.clock
    this.modelOptions = options.modelOptions ?? {}
    mkdirSync(this.folder, { recursive: true })
  }

  agentOf(sessionId: SessionId): PiAgentHarness {
    return this.entryOf(sessionId).agent
  }

  hold(sessionId: SessionId, request: AgentRequest): () => void {
    const entry = this.entryOf(sessionId)
    const release = entry.access.enter(request)
    return () => {
      release()
      if (!entry.access.isHeld()) {
        entry.idle = setTimeout(() => {
          this.close(sessionId).catch((error: unknown) => console.error(error))
        }, SessionAgents.idleMs)
      }
    }
  }

  async move(from: SessionId, to: SessionId): Promise<boolean> {
    const source = this.fileOf(from)
    const target = this.fileOf(to)
    if (
      !existsSync(source) ||
      existsSync(target) ||
      this.open.has(to) ||
      this.open.get(from)?.access.isHeld() === true
    ) {
      return false
    }
    await this.close(from)
    for (const suffix of SessionAgents.copiedParts) {
      if (existsSync(`${source}${suffix}`)) {
        copyFileSync(`${source}${suffix}`, `${target}${suffix}`)
      }
    }
    for (const suffix of SessionAgents.fileParts) {
      rmSync(`${source}${suffix}`, { force: true })
    }
    return true
  }

  purge(cutoff: number): number {
    let removed = 0
    for (const name of readdirSync(this.folder)) {
      const sessionId = name.split(".")[0] ?? ""
      const file = join(this.folder, name)
      if (
        isSessionId(sessionId) &&
        !this.open.has(sessionId) &&
        statSync(file).mtimeMs < cutoff
      ) {
        rmSync(file, { force: true })
        removed += name.endsWith(SessionAgents.fileSuffix) ? 1 : 0
      }
    }
    return removed
  }

  async closeAll(): Promise<void> {
    await Promise.all([...this.open.keys()].map((id) => this.close(id)))
  }

  private entryOf(sessionId: SessionId): OpenAgent {
    const found = this.open.get(sessionId)
    if (found !== undefined) {
      if (found.idle !== null) {
        clearTimeout(found.idle)
        found.idle = null
      }
      return found
    }
    const access = new AgentAccess()
    const model = this.model
    const file = this.fileOf(sessionId)
    const agent = routerAgentHarness({
      model,
      modelOptions: { ...this.modelOptions, keyOf: () => access.modelKey() },
      storage: () => openSqliteFileStorage(file),
      apps: this.apps,
      handlers: () => access.handlers(),
      clock: this.clock,
    })
    const entry: OpenAgent = { agent, access, idle: null }
    this.open.set(sessionId, entry)
    return entry
  }

  private fileOf(sessionId: SessionId): string {
    return join(this.folder, `${sessionId}${SessionAgents.fileSuffix}`)
  }

  private async close(sessionId: SessionId): Promise<void> {
    const entry = this.open.get(sessionId)
    if (entry === undefined || entry.access.isHeld()) {
      return
    }
    this.open.delete(sessionId)
    if (entry.idle !== null) {
      clearTimeout(entry.idle)
    }
    await entry.agent.close()
  }
}
