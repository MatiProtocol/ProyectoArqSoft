export interface IBookingUsageReadRepository {
  isCategoryUsed(categoryName: string): Promise<boolean>;
}
