import { BookingCustomerType } from '../enums/booking-customer-type';
import { BookingPerformanceTier } from '../enums/booking-performance-tier';
import type { BookingStatus } from '../enums/booking-status';
import type { AssignedResources } from '../value-objects/assigned-resources';
import type { Coordinates } from '../value-objects/coordinates';
import type { PaymentResult } from '../value-objects/payment-result';
import type { Item } from './item';

export class Booking {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly origin: Coordinates,
    public readonly destination: Coordinates,
    public readonly date: string,
    public readonly items: Item[],
    public readonly category: string | undefined,
    public readonly status: BookingStatus,
    public readonly customerType: BookingCustomerType = BookingCustomerType.INDIVIDUAL,
    public readonly performanceTier: BookingPerformanceTier = BookingPerformanceTier.INDIVIDUAL,
    public readonly estimatedCost?: number,
    public readonly payment?: PaymentResult,
    public readonly assignedResources?: AssignedResources
  ) {}
}
