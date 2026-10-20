import { CategorySource } from '../enums/category-source';

export class Category {
  constructor(
    public readonly nameEn: string,
    public readonly nameEs: string,
    public readonly description?: string,
    public readonly source: CategorySource = CategorySource.ADMIN
  ) {}
}
