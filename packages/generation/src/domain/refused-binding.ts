import type { EngineBinding } from "@rosesfield/contract"
import { EngineBindingInvalidError } from "#domain/error/engine-binding-invalid.error"

type RefusedConfig = {
  adapter: string
  reason: string
}

export const refusedAdapter = "refused"

/** Binds a run that no engine may start, so a binding the catalog could not build refuses its own runs with its reason instead of failing the catalog. */
export function refusedBinding(config: RefusedConfig): EngineBinding {
  return { adapter: refusedAdapter, config: { ...config } }
}

export function refusalOf(
  binding: EngineBinding
): EngineBindingInvalidError | null {
  if (binding.adapter !== refusedAdapter) {
    return null
  }
  const { adapter, reason } = binding.config
  return new EngineBindingInvalidError({
    adapter: typeof adapter === "string" ? adapter : refusedAdapter,
    reason: typeof reason === "string" ? reason : "the binding refuses runs",
  })
}
