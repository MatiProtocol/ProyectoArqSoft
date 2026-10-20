export interface IRegisteredDeviceProvider {
  isRegistered(deviceId: string): Promise<boolean>;
}
