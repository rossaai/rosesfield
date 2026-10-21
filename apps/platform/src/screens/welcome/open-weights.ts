import type { Workflow } from "@rosesfield/catalog/workflows"
import type { AppListing } from "@rosesfield/contract"
import { t } from "@/copy/t"

export type LicenceId =
  | "apache-2-0"
  | "mit"
  | "bsd-3-clause"
  | "ltx-community"
  | "film"

export type ModelId =
  | "flux-2-klein-4b"
  | "z-image-turbo"
  | "qwen-image-2512"
  | "qwen-image"
  | "qwen-image-edit-2511"
  | "qwen-image-edit-2509"
  | "qwen-image-layered"
  | "ltx-2-5"
  | "wan-2-2"
  | "wan-2-2-fun"
  | "wan-2-1-vace"
  | "infinitetalk"
  | "seedvr2"
  | "real-esrgan"
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
    id: "wan-2-2",
    licence: "apache-2-0",
    link: `${huggingFace}/Wan-AI/Wan2.2-I2V-A14B`,
    files: ["Wan-AI/Wan2.2-I2V-A14B", "Wan-AI/Wan2.2-T2V-A14B"],
  },
  {
    id: "wan-2-2-fun",
    licence: "apache-2-0",
    link: `${huggingFace}/alibaba-pai/Wan2.2-Fun-A14B-Control-Camera`,
    files: [
      "alibaba-pai/Wan2.2-Fun-A14B-Control-Camera",
      "alibaba-pai/Wan2.2-Fun-A14B-Control",
      "wan2.2_fun_camera_high_noise_14B_fp8_scaled.safetensors",
    ],
  },
  {
    id: "wan-2-1-vace",
    licence: "apache-2-0",
    link: `${huggingFace}/Wan-AI/Wan2.1-VACE-14B`,
    files: ["wan2.1_vace_14B_fp16.safetensors", "Wan-AI/Wan2.1-VACE-14B"],
  },
  {
    id: "infinitetalk",
    licence: "apache-2-0",
    link: `${huggingFace}/MeiGen-AI/InfiniteTalk`,
    files: [
      "Wan2_1-InfiniTetalk-Single_fp16.safetensors",
      "wan2.1_infiniteTalk_single_fp16.safetensors",
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
    id: "real-esrgan",
    licence: "bsd-3-clause",
    link: "https://github.com/xinntao/Real-ESRGAN",
    files: ["RealESRGAN_x4plus.safetensors"],
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
