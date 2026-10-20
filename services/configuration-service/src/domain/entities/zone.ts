import type { ZoneType } from '../enums/zone-type';

export class Zone {
  constructor(
    public readonly name: string,
    public readonly type: ZoneType,
    public readonly coordinates: [number, number][]
  ) {}
}
