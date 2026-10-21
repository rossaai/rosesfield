import type { Asset } from "@rosesfield/contract"

type Named = { name: string; bytes: number }

export type AddedRecording = { id: string; file: File }

export class RecordingNames {
  private readonly named = new Map<string, Named>()

  remember(added: AddedRecording): void {
    this.named.set(added.id, { name: added.file.name, bytes: added.file.size })
  }

  nameOf(asset: Pick<Asset, "id" | "bytes">): string | null {
    const found = this.named.get(asset.id)
    if (found === undefined || found.bytes !== asset.bytes) {
      return null
    }
    return found.name
  }
}

export const recordingNames = new RecordingNames()

export function audioFilesOf(files: readonly File[]): File[] {
  return files.filter((file) => file.type.startsWith("audio/"))
}

export function addedRecordingOf(
  before: readonly string[],
  after: readonly string[],
  offered: readonly File[]
): AddedRecording | null {
  const added = after.filter((id) => !before.includes(id))
  const [id] = added
  const [file] = offered
  if (added.length !== 1 || id === undefined || file === undefined) {
    return null
  }
  return { id, file }
}
