import type { ItemSize } from '../../domain/enums/item-size';
import type { Coordinates } from '../../domain/value-objects/coordinates';

export type ManualClassificationTask = {
  bookingId: string;
  userId: string;
  origin: Coordinates;
  destination: Coordinates;
  date: string;
  status: 'pending_classification';
  queuedAt: string;
  items: Array<{
    id: string;
    description: string;
    value?: string;
    size?: ItemSize;
  }>;
};

export interface ManualClassificationQueue {
  claimNext(operatorUserId: string): Promise<ManualClassificationTask | undefined>;
  ensureClaimedBy(bookingId: string, operatorUserId: string): Promise<void>;
  complete(bookingId: string, operatorUserId: string): Promise<void>;
}
