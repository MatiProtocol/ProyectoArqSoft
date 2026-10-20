import type { VehicleType } from '../enums/vehicle-type';

export class Vehicle {
  constructor(
    public readonly licensePlate: string,
    public readonly type: VehicleType,
    public readonly capacity: number,
    public readonly deviceId?: string,
    public readonly characteristics?: Record<string, unknown>,
    public readonly available: boolean = true
  ) {}
}
