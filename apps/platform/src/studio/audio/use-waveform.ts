import { useQuery } from "@tanstack/react-query"
import { readWaveform, type Waveform } from "@/studio/audio/waveform"

const waveformKey = "waveform"

export function useWaveform(
  assetId: string,
  src: string | null
): Waveform | null {
  const query = useQuery({
    queryKey: [waveformKey, assetId],
    queryFn: ({ signal }) =>
      src === null ? null : readWaveform(src, signal),
    enabled: src !== null,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })
  return query.data ?? null
}
