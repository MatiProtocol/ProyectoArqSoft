import type { IRegisteredDeviceProvider } from '../../application/contracts/registered-device.provider';
import { VehicleModel } from '../models/vehicle.model';

const DEFAULT_TTL_MS = 60000;

export class RegisteredDeviceCache implements IRegisteredDeviceProvider {
  private devices: Set<string> = new Set();
  private lastRefresh = 0;

  constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  async isRegistered(deviceId: string): Promise<boolean> {
    await this.refreshIfStale();

    if (this.devices.has(deviceId)) return true;

    const exists = await VehicleModel.exists({ deviceId });
    if (exists) {
      this.devices.add(deviceId);
      return true;
    }

    return false;
  }

  private async refreshIfStale(): Promise<void> {
    const now = Date.now();
    if (this.lastRefresh !== 0 && now - this.lastRefresh < this.ttlMs) return;

    const vehicles = await VehicleModel.find({ deviceId: { $exists: true, $ne: null } })
      .select('deviceId')
      .lean();

    this.devices = new Set(
      vehicles
        .map((vehicle) => vehicle.deviceId)
        .filter((deviceId): deviceId is string => Boolean(deviceId))
    );
    this.lastRefresh = now;
  }
}
