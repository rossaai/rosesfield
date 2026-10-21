import {
  Device,
  type DeviceFile,
  type PickFilesOptions,
} from "@/device/device.port"

type NamingDeviceOptions = {
  inner: Device
  onPick: (files: readonly File[]) => void
}

export class NamingDevice extends Device {
  private readonly inner: Device
  private readonly onPick: (files: readonly File[]) => void

  constructor(options: NamingDeviceOptions) {
    super()
    this.inner = options.inner
    this.onPick = options.onPick
  }

  override async pickFiles(options: PickFilesOptions): Promise<File[]> {
    const files = await this.inner.pickFiles(options)
    this.onPick(files)
    return files
  }

  override save(file: DeviceFile): Promise<void> {
    return this.inner.save(file)
  }

  override canShare(file: DeviceFile): boolean {
    return this.inner.canShare(file)
  }

  override share(file: DeviceFile): Promise<void> {
    return this.inner.share(file)
  }

  override copyText(text: string): Promise<void> {
    return this.inner.copyText(text)
  }
}
