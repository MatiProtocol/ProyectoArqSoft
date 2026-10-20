import type { Coordinates } from '../../domain/value-objects/coordinates';
import type { PaymentResult } from '../../domain/value-objects/payment-result';
import type { AssignedResourcesReadDto } from './assigned-resources-read.dto';
import type { BookingStatusDto } from './enums/booking-status.dto';
import type { ItemReadDto } from './item-read.dto';

export type BookingReadDto = {
  id: string;
  userId: string;
  origin: Coordinates;
  destination: Coordinates;
  date: string;
  items: ItemReadDto[];
  category?: string;
  status: BookingStatusDto;
  estimatedCost?: number;
  payment?: PaymentResult;
  assignedResources?: AssignedResourcesReadDto;
};
