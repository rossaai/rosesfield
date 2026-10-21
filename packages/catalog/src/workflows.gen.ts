import type { WorkflowFiles } from "#workflow-entry.contract"
import wAdsFlux2Klein4bApi from "../../../workflows/ads-flux-2-klein-4b/ads-flux-2-klein-4b.api.json"
import wAdsFlux2Klein4bEntry from "../../../workflows/ads-flux-2-klein-4b/entry.json"
import wAdsQwenImageEdit2511Api from "../../../workflows/ads-qwen-image-edit-2511/ads-qwen-image-edit-2511.api.json"
import wAdsQwenImageEdit2511Entry from "../../../workflows/ads-qwen-image-edit-2511/entry.json"
import wAnglesQwenImageEdit2511Api from "../../../workflows/angles-qwen-image-edit-2511/angles-qwen-image-edit-2511.api.json"
import wAnglesQwenImageEdit2511Entry from "../../../workflows/angles-qwen-image-edit-2511/entry.json"
import wAnglesSetQwenImageEdit2511Api from "../../../workflows/angles-set-qwen-image-edit-2511/angles-set-qwen-image-edit-2511.api.json"
import wAnglesSetQwenImageEdit2511Entry from "../../../workflows/angles-set-qwen-image-edit-2511/entry.json"
import wBackgroundRemovalSolidColorApi from "../../../workflows/background-removal-solid-color/background-removal-solid-color.api.json"
import wBackgroundRemovalSolidColorEntry from "../../../workflows/background-removal-solid-color/entry.json"
import wBackgroundRemovalTransparentApi from "../../../workflows/background-removal-transparent/background-removal-transparent.api.json"
import wBackgroundRemovalTransparentEntry from "../../../workflows/background-removal-transparent/entry.json"
import wCharactersAnglesQwenImageEdit2511Api from "../../../workflows/characters-angles-qwen-image-edit-2511/characters-angles-qwen-image-edit-2511.api.json"
import wCharactersAnglesQwenImageEdit2511Entry from "../../../workflows/characters-angles-qwen-image-edit-2511/entry.json"
import wCharactersTraitsFlux2Klein4bApi from "../../../workflows/characters-traits-flux-2-klein-4b/characters-traits-flux-2-klein-4b.api.json"
import wCharactersTraitsFlux2Klein4bEntry from "../../../workflows/characters-traits-flux-2-klein-4b/entry.json"
import wCharactersTraitsQwenImage2512Api from "../../../workflows/characters-traits-qwen-image-2512/characters-traits-qwen-image-2512.api.json"
import wCharactersTraitsQwenImage2512Entry from "../../../workflows/characters-traits-qwen-image-2512/entry.json"
import wCharactersTraitsZImageTurboApi from "../../../workflows/characters-traits-z-image-turbo/characters-traits-z-image-turbo.api.json"
import wCharactersTraitsZImageTurboEntry from "../../../workflows/characters-traits-z-image-turbo/entry.json"
import wEditQwenImageEdit2511Api from "../../../workflows/edit-qwen-image-edit-2511/edit-qwen-image-edit-2511.api.json"
import wEditQwenImageEdit2511Entry from "../../../workflows/edit-qwen-image-edit-2511/entry.json"
import wEffectsLtx25Api from "../../../workflows/effects-ltx-2-5/effects-ltx-2-5.api.json"
import wEffectsLtx25Entry from "../../../workflows/effects-ltx-2-5/entry.json"
import wExpandFormatQwenImageApi from "../../../workflows/expand-format-qwen-image/expand-format-qwen-image.api.json"
import wExpandFormatQwenImageEntry from "../../../workflows/expand-format-qwen-image/entry.json"
import wExpandSidesQwenImageApi from "../../../workflows/expand-sides-qwen-image/expand-sides-qwen-image.api.json"
import wExpandSidesQwenImageEntry from "../../../workflows/expand-sides-qwen-image/entry.json"
import wImageMingImage01DesignApi from "../../../workflows/image-ming-image-0-1-design/image-ming-image-0-1-design.api.json"
import wImageMingImage01DesignEntry from "../../../workflows/image-ming-image-0-1-design/entry.json"
import wImageQwenImage2512Api from "../../../workflows/image-qwen-image-2512/image-qwen-image-2512.api.json"
import wImageQwenImage2512Entry from "../../../workflows/image-qwen-image-2512/entry.json"
import wImageZImageTurboApi from "../../../workflows/image-z-image-turbo/image-z-image-turbo.api.json"
import wImageZImageTurboEntry from "../../../workflows/image-z-image-turbo/entry.json"
import wLayersEditQwenImageEdit2511Api from "../../../workflows/layers-edit-qwen-image-edit-2511/layers-edit-qwen-image-edit-2511.api.json"
import wLayersEditQwenImageEdit2511Entry from "../../../workflows/layers-edit-qwen-image-edit-2511/entry.json"
import wLayersFillQwenImageApi from "../../../workflows/layers-fill-qwen-image/layers-fill-qwen-image.api.json"
import wLayersFillQwenImageEntry from "../../../workflows/layers-fill-qwen-image/entry.json"
import wLayersSplitQwenImageLayeredApi from "../../../workflows/layers-split-qwen-image-layered/layers-split-qwen-image-layered.api.json"
import wLayersSplitQwenImageLayeredEntry from "../../../workflows/layers-split-qwen-image-layered/entry.json"
import wLipsyncClipInfinitetalkApi from "../../../workflows/lipsync-clip-infinitetalk/lipsync-clip-infinitetalk.api.json"
import wLipsyncClipInfinitetalkEntry from "../../../workflows/lipsync-clip-infinitetalk/entry.json"
import wLipsyncPhotoInfinitetalkApi from "../../../workflows/lipsync-photo-infinitetalk/lipsync-photo-infinitetalk.api.json"
import wLipsyncPhotoInfinitetalkEntry from "../../../workflows/lipsync-photo-infinitetalk/entry.json"
import wMotionWanAnimate2Api from "../../../workflows/motion-wan-animate-2/motion-wan-animate-2.api.json"
import wMotionWanAnimate2Entry from "../../../workflows/motion-wan-animate-2/entry.json"
import wRecastCharacterScail2Api from "../../../workflows/recast-character-scail-2/recast-character-scail-2.api.json"
import wRecastCharacterScail2Entry from "../../../workflows/recast-character-scail-2/entry.json"
import wRecastObjectWanVaceApi from "../../../workflows/recast-object-wan-vace/recast-object-wan-vace.api.json"
import wRecastObjectWanVaceEntry from "../../../workflows/recast-object-wan-vace/entry.json"
import wRelightQwenImageEdit2509Api from "../../../workflows/relight-qwen-image-edit-2509/relight-qwen-image-edit-2509.api.json"
import wRelightQwenImageEdit2509Entry from "../../../workflows/relight-qwen-image-edit-2509/entry.json"
import wShotLtx25Api from "../../../workflows/shot-ltx-2-5/shot-ltx-2-5.api.json"
import wShotLtx25Entry from "../../../workflows/shot-ltx-2-5/entry.json"
import wShotWan22FunCameraApi from "../../../workflows/shot-wan-2-2-fun-camera/shot-wan-2-2-fun-camera.api.json"
import wShotWan22FunCameraEntry from "../../../workflows/shot-wan-2-2-fun-camera/entry.json"
import wStoryboardFlux2Klein4bApi from "../../../workflows/storyboard-flux-2-klein-4b/storyboard-flux-2-klein-4b.api.json"
import wStoryboardFlux2Klein4bEntry from "../../../workflows/storyboard-flux-2-klein-4b/entry.json"
import wStoryboardFlux2Klein4bFromTextApi from "../../../workflows/storyboard-flux-2-klein-4b-from-text/storyboard-flux-2-klein-4b-from-text.api.json"
import wStoryboardFlux2Klein4bFromTextEntry from "../../../workflows/storyboard-flux-2-klein-4b-from-text/entry.json"
import wStoryboardQwenImageEdit2511Api from "../../../workflows/storyboard-qwen-image-edit-2511/storyboard-qwen-image-edit-2511.api.json"
import wStoryboardQwenImageEdit2511Entry from "../../../workflows/storyboard-qwen-image-edit-2511/entry.json"
import wStoryboardQwenImageEdit2511FromTextApi from "../../../workflows/storyboard-qwen-image-edit-2511-from-text/storyboard-qwen-image-edit-2511-from-text.api.json"
import wStoryboardQwenImageEdit2511FromTextEntry from "../../../workflows/storyboard-qwen-image-edit-2511-from-text/entry.json"
import wTryOnQwenImageEdit2511Api from "../../../workflows/try-on-qwen-image-edit-2511/try-on-qwen-image-edit-2511.api.json"
import wTryOnQwenImageEdit2511Entry from "../../../workflows/try-on-qwen-image-edit-2511/entry.json"
import wUpscaleImageSeedvr2Api from "../../../workflows/upscale-image-seedvr2/upscale-image-seedvr2.api.json"
import wUpscaleImageSeedvr2Entry from "../../../workflows/upscale-image-seedvr2/entry.json"
import wUpscaleVideoSeedvr2Api from "../../../workflows/upscale-video-seedvr2/upscale-video-seedvr2.api.json"
import wUpscaleVideoSeedvr2Entry from "../../../workflows/upscale-video-seedvr2/entry.json"
import wVideoEditBackgroundBirefnetApi from "../../../workflows/video-edit-background-birefnet/video-edit-background-birefnet.api.json"
import wVideoEditBackgroundBirefnetEntry from "../../../workflows/video-edit-background-birefnet/entry.json"
import wVideoEditFrameRateFilmApi from "../../../workflows/video-edit-frame-rate-film/video-edit-frame-rate-film.api.json"
import wVideoEditFrameRateFilmEntry from "../../../workflows/video-edit-frame-rate-film/entry.json"
import wVideoEditReframeLtx23Api from "../../../workflows/video-edit-reframe-ltx-2-3/video-edit-reframe-ltx-2-3.api.json"
import wVideoEditReframeLtx23Entry from "../../../workflows/video-edit-reframe-ltx-2-3/entry.json"
import wVideoLtx25StartFrameApi from "../../../workflows/video-ltx-2-5-start-frame/video-ltx-2-5-start-frame.api.json"
import wVideoLtx25StartFrameEntry from "../../../workflows/video-ltx-2-5-start-frame/entry.json"
import wVideoLtx25TextApi from "../../../workflows/video-ltx-2-5-text/video-ltx-2-5-text.api.json"
import wVideoLtx25TextEntry from "../../../workflows/video-ltx-2-5-text/entry.json"
import wVoiceChatterboxApi from "../../../workflows/voice-chatterbox/voice-chatterbox.api.json"
import wVoiceChatterboxEntry from "../../../workflows/voice-chatterbox/entry.json"

export const workflowFiles: readonly WorkflowFiles[] = [
  { folder: "ads-flux-2-klein-4b", entry: wAdsFlux2Klein4bEntry, graph: wAdsFlux2Klein4bApi },
  { folder: "ads-qwen-image-edit-2511", entry: wAdsQwenImageEdit2511Entry, graph: wAdsQwenImageEdit2511Api },
  { folder: "angles-qwen-image-edit-2511", entry: wAnglesQwenImageEdit2511Entry, graph: wAnglesQwenImageEdit2511Api },
  { folder: "angles-set-qwen-image-edit-2511", entry: wAnglesSetQwenImageEdit2511Entry, graph: wAnglesSetQwenImageEdit2511Api },
  { folder: "background-removal-solid-color", entry: wBackgroundRemovalSolidColorEntry, graph: wBackgroundRemovalSolidColorApi },
  { folder: "background-removal-transparent", entry: wBackgroundRemovalTransparentEntry, graph: wBackgroundRemovalTransparentApi },
  { folder: "characters-angles-qwen-image-edit-2511", entry: wCharactersAnglesQwenImageEdit2511Entry, graph: wCharactersAnglesQwenImageEdit2511Api },
  { folder: "characters-traits-flux-2-klein-4b", entry: wCharactersTraitsFlux2Klein4bEntry, graph: wCharactersTraitsFlux2Klein4bApi },
  { folder: "characters-traits-qwen-image-2512", entry: wCharactersTraitsQwenImage2512Entry, graph: wCharactersTraitsQwenImage2512Api },
  { folder: "characters-traits-z-image-turbo", entry: wCharactersTraitsZImageTurboEntry, graph: wCharactersTraitsZImageTurboApi },
  { folder: "edit-qwen-image-edit-2511", entry: wEditQwenImageEdit2511Entry, graph: wEditQwenImageEdit2511Api },
  { folder: "effects-ltx-2-5", entry: wEffectsLtx25Entry, graph: wEffectsLtx25Api },
  { folder: "expand-format-qwen-image", entry: wExpandFormatQwenImageEntry, graph: wExpandFormatQwenImageApi },
  { folder: "expand-sides-qwen-image", entry: wExpandSidesQwenImageEntry, graph: wExpandSidesQwenImageApi },
  { folder: "image-ming-image-0-1-design", entry: wImageMingImage01DesignEntry, graph: wImageMingImage01DesignApi },
  { folder: "image-qwen-image-2512", entry: wImageQwenImage2512Entry, graph: wImageQwenImage2512Api },
  { folder: "image-z-image-turbo", entry: wImageZImageTurboEntry, graph: wImageZImageTurboApi },
  { folder: "layers-edit-qwen-image-edit-2511", entry: wLayersEditQwenImageEdit2511Entry, graph: wLayersEditQwenImageEdit2511Api },
  { folder: "layers-fill-qwen-image", entry: wLayersFillQwenImageEntry, graph: wLayersFillQwenImageApi },
  { folder: "layers-split-qwen-image-layered", entry: wLayersSplitQwenImageLayeredEntry, graph: wLayersSplitQwenImageLayeredApi },
  { folder: "lipsync-clip-infinitetalk", entry: wLipsyncClipInfinitetalkEntry, graph: wLipsyncClipInfinitetalkApi },
  { folder: "lipsync-photo-infinitetalk", entry: wLipsyncPhotoInfinitetalkEntry, graph: wLipsyncPhotoInfinitetalkApi },
  { folder: "motion-wan-animate-2", entry: wMotionWanAnimate2Entry, graph: wMotionWanAnimate2Api },
  { folder: "recast-character-scail-2", entry: wRecastCharacterScail2Entry, graph: wRecastCharacterScail2Api },
  { folder: "recast-object-wan-vace", entry: wRecastObjectWanVaceEntry, graph: wRecastObjectWanVaceApi },
  { folder: "relight-qwen-image-edit-2509", entry: wRelightQwenImageEdit2509Entry, graph: wRelightQwenImageEdit2509Api },
  { folder: "shot-ltx-2-5", entry: wShotLtx25Entry, graph: wShotLtx25Api },
  { folder: "shot-wan-2-2-fun-camera", entry: wShotWan22FunCameraEntry, graph: wShotWan22FunCameraApi },
  { folder: "storyboard-flux-2-klein-4b", entry: wStoryboardFlux2Klein4bEntry, graph: wStoryboardFlux2Klein4bApi },
  { folder: "storyboard-flux-2-klein-4b-from-text", entry: wStoryboardFlux2Klein4bFromTextEntry, graph: wStoryboardFlux2Klein4bFromTextApi },
  { folder: "storyboard-qwen-image-edit-2511", entry: wStoryboardQwenImageEdit2511Entry, graph: wStoryboardQwenImageEdit2511Api },
  { folder: "storyboard-qwen-image-edit-2511-from-text", entry: wStoryboardQwenImageEdit2511FromTextEntry, graph: wStoryboardQwenImageEdit2511FromTextApi },
  { folder: "try-on-qwen-image-edit-2511", entry: wTryOnQwenImageEdit2511Entry, graph: wTryOnQwenImageEdit2511Api },
  { folder: "upscale-image-seedvr2", entry: wUpscaleImageSeedvr2Entry, graph: wUpscaleImageSeedvr2Api },
  { folder: "upscale-video-seedvr2", entry: wUpscaleVideoSeedvr2Entry, graph: wUpscaleVideoSeedvr2Api },
  { folder: "video-edit-background-birefnet", entry: wVideoEditBackgroundBirefnetEntry, graph: wVideoEditBackgroundBirefnetApi },
  { folder: "video-edit-frame-rate-film", entry: wVideoEditFrameRateFilmEntry, graph: wVideoEditFrameRateFilmApi },
  { folder: "video-edit-reframe-ltx-2-3", entry: wVideoEditReframeLtx23Entry, graph: wVideoEditReframeLtx23Api },
  { folder: "video-ltx-2-5-start-frame", entry: wVideoLtx25StartFrameEntry, graph: wVideoLtx25StartFrameApi },
  { folder: "video-ltx-2-5-text", entry: wVideoLtx25TextEntry, graph: wVideoLtx25TextApi },
  { folder: "voice-chatterbox", entry: wVoiceChatterboxEntry, graph: wVoiceChatterboxApi },
]
