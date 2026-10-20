import type { Coordinates } from '../../domain/value-objects/coordinates';
import type { ItemWriteDto } from './item-write.dto';

export type BookingWriteDto = {
  origin: Coordinates;
  destination: Coordinates;
  date: string;
  items: ItemWriteDto[];
};
