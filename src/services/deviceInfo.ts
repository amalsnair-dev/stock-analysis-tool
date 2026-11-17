import * as Device from "expo-device";
import * as Network from "expo-network";

export type DeviceInfo = {
  macId: string | null;
  ip: string | null;
  deviceName: string | null;
  deviceModel: string | null;
  operatingSystem: string | null;
  osVersion: string | null;
};

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const ip = await Network.getIpAddressAsync();

  const deviceName = Device.deviceName;
  const deviceModel = Device.modelName;
  const operatingSystem = Device.osName;
  const osVersion = Device.osVersion;

  console.log("DEVICE IP:", ip);
  console.log("DEVICE NAME:", deviceName);
  console.log("DEVICE MODEL:", deviceModel);
  console.log("DEVICE OS:", operatingSystem);
  console.log("DEVICE OS VERSION:", osVersion);

  return {
    macId: null,
    ip: ip && ip !== "0.0.0.0" ? ip : null,
    deviceName,
    deviceModel,
    operatingSystem,
    osVersion,
  };
}
