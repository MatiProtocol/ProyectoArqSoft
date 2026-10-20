import type { ZoneType } from '../enums/zone-type';

export type ZoneReadDto = {
  id: number;
  name: string;
  type: ZoneType;
  coordinates: number[][];
};
