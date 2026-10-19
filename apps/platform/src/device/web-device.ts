import {
  Device,
  type DeviceFile,
  type PickFilesOptions,
} from "@/device/device.port"

function fileOf(file: DeviceFile): File {
  return new File([file.blob], file.name, { type: file.blob.type })
}

export class WebDevice extends Device {
  override pickFiles(options: PickFilesOptions): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = options.accept.join(",")
      input.multiple = options.multiple
      input.addEventListener("change", () =>
        resolve(Array.from(input.files ?? []))
      )
      input.addEventListener("cancel", () => resolve([]))
      input.click()
    })
  }

  override async save(file: DeviceFile): Promise<void> {
    const url = URL.createObjectURL(file.blob)
    const link = document.createElement("a")
    link.href = url
    link.download = file.name
    link.rel = "noopener"
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  override canShare(file: DeviceFile): boolean {
    return (
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [fileOf(file)] })
    )
  }

  override async share(file: DeviceFile): Promise<void> {
    await navigator.share({ files: [fileOf(file)] })
  }

  override async copyText(text: string): Promise<void> {
    await navigator.clipboard.writeText(text)
  }
}
