import type { ItemSize } from '../../../domain/enums/item-size';
import type { Coordinates } from '../../../domain/value-objects/coordinates';

export type CreateBookingItem = {
  description: string;
  value?: string;
  size?: ItemSize;
};

export class CreateBookingCommand {
  constructor(
    public readonly userId: string,
    public readonly origin: Coordinates,
    public readonly destination: Coordinates,
    public readonly date: string,
    public readonly items: CreateBookingItem[]
  ) {}
}
