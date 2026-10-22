import { Device, type PickFilesOptions } from "@/device/device.port"

export class FakeDevice extends Device {
  readonly picks: PickFilesOptions[] = []
  private readonly files: File[]

  constructor(options: { files: File[] }) {
    super()
    this.files = options.files
  }

  override pickFiles(options: PickFilesOptions): Promise<File[]> {
    this.picks.push(options)
    return Promise.resolve(this.files)
  }

  override save(): Promise<void> {
    return Promise.resolve()
  }

  override canShare(): boolean {
    return false
  }

  override share(): Promise<void> {
    return Promise.resolve()
  }

  override copyText(): Promise<void> {
    return Promise.resolve()
  }
}
