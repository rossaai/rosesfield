import {
  type KeyCheck,
  keyCheck,
  type RunOrigin,
  runOrigin,
} from "@rosesfield/contract"
import { callPathFor, fieldOf, oneOf } from "@/api/call-path"
import { type EngineTarget, engineTargets } from "@/api/gateway-settings"

export type EngineCheck = {
  target: EngineTarget
  origin: RunOrigin
  check: KeyCheck
}

const checkPath = "/api/settings/engine/check"

function itemsOf<Item>(
  value: unknown,
  read: (item: unknown) => Item | null
): Item[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  const items = value.map(read)
  return items.every((item): item is Item => item !== null) ? items : null
}

function engineCheckOf(value: unknown): EngineCheck | null {
  const target = oneOf(fieldOf(value, "target"), engineTargets)
  const origin = runOrigin.safeParse(fieldOf(value, "origin"))
  const check = keyCheck.safeParse(fieldOf(value, "check"))
  return target === null || !origin.success || !check.success
    ? null
    : { target, origin: origin.data, check: check.data }
}

export function readChecks(body: unknown): EngineCheck[] | null {
  return itemsOf(fieldOf(body, "checks"), engineCheckOf)
}

export function liveCheckOf(checks: readonly EngineCheck[]): KeyCheck | null {
  return checks.find((one) => one.origin === "live")?.check ?? null
}

export function checkEngineKey(): Promise<EngineCheck[]> {
  return callPathFor({ method: "POST", path: checkPath }, readChecks)
}
