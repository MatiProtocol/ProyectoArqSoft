import type { ZoneType } from '../enums/zone-type';

export type UpdateZoneDto = {
  name?: string;
  type?: ZoneType;
  coordinates?: [number, number][];
};
