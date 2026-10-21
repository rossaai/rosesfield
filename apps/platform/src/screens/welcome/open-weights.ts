import type { Workflow } from "@rosesfield/catalog/workflows"
import type { AppListing } from "@rosesfield/contract"
import { t } from "@/copy/t"

export type LicenceId = "apache-2-0" | "mit" | "ltx-community" | "film"

export type ModelId =
  | "flux-2-klein-4b"
  | "z-image-turbo"
  | "qwen-image-2512"
  | "qwen-image"
  | "qwen-image-edit-2511"
  | "qwen-image-edit-2509"
  | "qwen-image-layered"
  | "ltx-2-5"
  | "seedvr2"
  | "birefnet"
  | "lucida"
  | "film"
  | "chatterbox"

export type OpenModel = {
  id: ModelId
  licence: LicenceId
  link: string
  files: readonly string[]
}

export type ModelRow = {
  model: OpenModel
  apps: AppListing[]
}

const huggingFace = "https://huggingface.co"

export const openModels: readonly OpenModel[] = [
  {
    id: "flux-2-klein-4b",
    licence: "apache-2-0",
    link: `${huggingFace}/black-forest-labs/FLUX.2-klein-4B`,
    files: ["flux-2-klein-4b.safetensors", "flux-2-klein-4b-fp8.safetensors"],
  },
  {
    id: "z-image-turbo",
    licence: "apache-2-0",
    link: `${huggingFace}/Tongyi-MAI/Z-Image-Turbo`,
    files: ["z_image_turbo_bf16.safetensors"],
  },
  {
    id: "qwen-image-2512",
    licence: "apache-2-0",
    link: `${huggingFace}/Qwen/Qwen-Image-2512`,
    files: ["qwen_image_2512_fp8_e4m3fn.safetensors"],
  },
  {
    id: "qwen-image",
    licence: "apache-2-0",
    link: `${huggingFace}/Qwen/Qwen-Image`,
    files: ["qwen_image_fp8_e4m3fn.safetensors"],
  },
  {
    id: "qwen-image-edit-2511",
    licence: "apache-2-0",
    link: `${huggingFace}/Qwen/Qwen-Image-Edit-2511`,
    files: [
      "qwen_image_edit_2511_bf16.safetensors",
      "qwen_image_edit_2511_fp8mixed.safetensors",
    ],
  },
  {
    id: "qwen-image-edit-2509",
    licence: "apache-2-0",
    link: `${huggingFace}/Qwen/Qwen-Image-Edit-2509`,
    files: ["qwen_image_edit_2509_fp8_e4m3fn.safetensors"],
  },
  {
    id: "qwen-image-layered",
    licence: "apache-2-0",
    link: `${huggingFace}/Qwen/Qwen-Image-Layered`,
    files: ["qwen_image_layered_bf16.safetensors"],
  },
  {
    id: "ltx-2-5",
    licence: "ltx-community",
    link: "https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x",
    files: [
      "ltx-2.5-22b-distilled-transformer-comfy-int8-convrot.safetensors",
      "Lightricks/LTX-2.5",
    ],
  },
  {
    id: "seedvr2",
    licence: "apache-2-0",
    link: `${huggingFace}/ByteDance-Seed/SeedVR2-7B`,
    files: [
      "seedvr2_3b_int8_convrot.safetensors",
      "seedvr2_7b_int8_convrot.safetensors",
    ],
  },
  {
    id: "birefnet",
    licence: "mit",
    link: `${huggingFace}/ZhengPeng7/BiRefNet`,
    files: ["birefnet.safetensors", "ZhengPeng7/BiRefNet"],
  },
  {
    id: "lucida",
    licence: "mit",
    link: `${huggingFace}/egeorcun/lucida`,
    files: ["lucida.safetensors"],
  },
  {
    id: "film",
    licence: "film",
    link: "https://github.com/google-research/frame-interpolation",
    files: ["google-research/frame-interpolation"],
  },
  {
    id: "chatterbox",
    licence: "mit",
    link: `${huggingFace}/ResembleAI/chatterbox`,
    files: ["t3_mtl23ls_v2.safetensors"],
  },
]

export function openModelOfFile(file: string): OpenModel | null {
  const name = file.split("/").at(-1) ?? file
  return (
    openModels.find(
      (model) => model.files.includes(file) || model.files.includes(name)
    ) ?? null
  )
}

export function openModelLabel(model: OpenModel): string {
  return t(`welcome.model.${model.id}`)
}

export const agentModelLink = `${huggingFace}/MiniMaxAI/MiniMax-M3`

function loads(model: OpenModel, workflows: readonly Workflow[]): boolean {
  return workflows.some((workflow) =>
    workflow.models.some((file) => model.files.includes(file))
  )
}

export function modelRowsOf(
  apps: readonly AppListing[],
  workflowsOf: (appId: string) => readonly Workflow[]
): ModelRow[] {
  const byApp = apps.map((app) => ({ app, workflows: workflowsOf(app.id) }))
  return openModels.flatMap((model) => {
    const users = byApp
      .filter((one) => loads(model, one.workflows))
      .map((one) => one.app)
    return users.length === 0 ? [] : [{ model, apps: users }]
  })
}
