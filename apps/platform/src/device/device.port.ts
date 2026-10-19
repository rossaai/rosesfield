export type PickFilesOptions = {
  accept: readonly string[]
  multiple: boolean
}

export type DeviceFile = {
  name: string
  blob: Blob
}

export abstract class Device {
  /** Opens the system file picker and returns the files you chose, or none. */
  abstract pickFiles(options: PickFilesOptions): Promise<File[]>

  /** Saves a file to the device, where the device keeps downloads. */
  abstract save(file: DeviceFile): Promise<void>

  /** Says whether the device can share a file through its own share sheet. */
  abstract canShare(file: DeviceFile): boolean

  /** Shares a file through the device's share sheet. */
  abstract share(file: DeviceFile): Promise<void>

  /** Writes text to the clipboard. */
  abstract copyText(text: string): Promise<void>
}
