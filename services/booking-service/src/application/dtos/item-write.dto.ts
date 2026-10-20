import type { ItemSizeDto } from './enums/item-size.dto';

export type ItemWriteDto = {
  description: string;
  value?: string;
  size?: ItemSizeDto;
};
