import type { ItemSize } from '../enums/item-size';

export class Item {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly category?: string,
    public readonly value?: string,
    public readonly size?: ItemSize
  ) {}
}
