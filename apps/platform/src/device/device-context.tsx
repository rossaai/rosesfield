import { createContext, type ReactElement, type ReactNode, use } from "react"
import type { Device } from "@/device/device.port"
import { WebDevice } from "@/device/web-device"

const DeviceContext = createContext<Device>(new WebDevice())

export function DeviceProvider({
  device,
  children,
}: {
  device: Device
  children: ReactNode
}): ReactElement {
  return <DeviceContext value={device}>{children}</DeviceContext>
}

export function useDevice(): Device {
  return use(DeviceContext)
}
