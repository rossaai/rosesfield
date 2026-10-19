export type FirstLightTarget =
  | { kind: "comfy"; label: string; baseUrl: string; apiKey: string }
  | { kind: "runpod"; label: string; endpointId: string; apiKey: string }

export type TargetRead =
  | { ok: true; target: FirstLightTarget }
  | { ok: false; problem: string }

export const comfyCloudUrl = "https://cloud.comfy.org"

type Environment = Readonly<Record<string, string | undefined>>

function settingOf(env: Environment, name: string): string | null {
  const value = env[name]?.trim() ?? ""
  return value === "" ? null : value
}

function refused(problem: string): TargetRead {
  return { ok: false, problem }
}

export function readTarget(env: Environment): TargetRead {
  const baseUrl = settingOf(env, "COMFY_BASE_URL")
  const endpointId = settingOf(env, "RUNPOD_ENDPOINT_ID")
  if (baseUrl !== null && endpointId !== null) {
    return refused(
      "COMFY_BASE_URL and RUNPOD_ENDPOINT_ID are both set. Set the one engine first-light runs against."
    )
  }
  if (endpointId !== null) {
    const apiKey = settingOf(env, "RUNPOD_API_KEY")
    return apiKey === null
      ? refused(
          "RUNPOD_API_KEY is missing. RUNPOD_ENDPOINT_ID names a RunPod Serverless endpoint, and every run there needs its key."
        )
      : {
          ok: true,
          target: {
            kind: "runpod",
            label: `RunPod Serverless endpoint ${endpointId}`,
            endpointId,
            apiKey,
          },
        }
  }
  const apiKey = settingOf(env, "COMFY_API_KEY")
  if (apiKey === null) {
    return refused(
      "COMFY_API_KEY is missing. first-light spends real GPU time, so it starts only with an engine key. Set COMFY_API_KEY, or RUNPOD_API_KEY with RUNPOD_ENDPOINT_ID."
    )
  }
  const url = baseUrl ?? comfyCloudUrl
  return {
    ok: true,
    target: {
      kind: "comfy",
      label: `Comfy API v2 at ${url}`,
      baseUrl: url,
      apiKey,
    },
  }
}
