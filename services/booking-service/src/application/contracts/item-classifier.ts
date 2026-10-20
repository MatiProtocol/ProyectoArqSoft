import type { CreateBookingItem } from '../commands/create-booking/create-booking.command';

export type ClassifiedItem = {
  index: number;
  category: string;
};

export type ItemClassificationResult = {
  recognized: boolean;
  items: ClassifiedItem[];
};

export interface ItemClassifier {
  classify(items: CreateBookingItem[]): Promise<ItemClassificationResult>;
}
