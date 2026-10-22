import { appDefinition, type EngineBinding } from "@rosesfield/contract"
import {
  type Fetch,
  type RouterCatalog,
  taskBinding,
} from "@rosesfield/generation"
import type { FixedClock } from "@rosesfield/kernel"
import { pickEngines } from "#compose/pick-engines"
import type { EngineSettings } from "#engine/engine-target"
import { type Harness, harnessFor, type PortsFor } from "../harness"
import { localPorts } from "../local-ports"
import { comfyCloud } from "../server-env"

const graph: EngineBinding = { adapter: "demo", config: {} }

function taskApp(id: string, tasks: string[]) {
  return appDefinition.parse({
    id,
    nameKey: "name",
    category: "image",
    inputs: [
      {
        type: "prompt",
        name: "prompt",
        labelKey: "inputs.prompt",
        presence: "required",
        maxLength: 2000,
      },
      {
        type: "choice",
        name: "model",
        labelKey: "inputs.model",
        options: [
          { value: "open-picture", labelKey: "model.openPicture" },
          { value: "open-sketch", labelKey: "model.openSketch" },
        ],
        default: "open-picture",
      },
    ],
    output: {
      kind: "image",
      count: { default: 1, max: 4 },
      aspectRatios: { options: ["1:1"], default: "1:1" },
    },
    engine: taskBinding({
      tasks,
      input: "model",
      default: "maker/picture-2",
      fallback: graph,
    }),
    limits: { timeoutSeconds: 600, maxRetries: 2 },
  })
}

const apps = [
  taskApp("pictures", ["text-to-image"]),
  taskApp("clips", ["text-to-video"]),
]

function portsWith(
  fetch: Fetch,
  catalog: (clock: FixedClock) => RouterCatalog,
  engine: EngineSettings
): PortsFor {
  return (clock, folder) => ({
    ...localPorts(clock, folder),
    apps,
    engines: pickEngines(engine, {
      clock,
      fetch,
      catalog: catalog(clock),
    }),
  })
}

let open: Harness[] = []

export function closeGateways(): void {
  for (const one of open) {
    one.close()
  }
  open = []
}

export function gatewayWith(
  fetch: Fetch,
  catalog: (clock: FixedClock) => RouterCatalog,
  engine: EngineSettings = comfyCloud("comfyui-owner")
): Harness {
  const gateway = harnessFor({ portsFor: portsWith(fetch, catalog, engine) })
  open.push(gateway)
  return gateway
}
