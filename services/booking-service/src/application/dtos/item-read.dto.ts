import type { ItemSizeDto } from './enums/item-size.dto';

export type ItemReadDto = {
  id: string;
  description: string;
  category?: string;
  value?: string;
  size?: ItemSizeDto;
};
