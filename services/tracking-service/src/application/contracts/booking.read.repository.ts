import type { Coordinates } from '../../domain/value-objects/coordinates';

export type BookingItemInfo = {
  size?: string;
};

export type BookingInfo = {
  id: string;
  status: string;
  origin: Coordinates;
  destination: Coordinates;
  category?: string;
  items: BookingItemInfo[];
};

export interface IBookingReadRepository {
  findById(id: string): Promise<BookingInfo | null>;
}
