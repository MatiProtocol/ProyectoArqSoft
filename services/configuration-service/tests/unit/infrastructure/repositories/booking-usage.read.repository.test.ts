import { BookingModel } from '../../../../src/infrastructure/models/booking.model';
import { BookingUsageReadRepository } from '../../../../src/infrastructure/repositories/booking-usage.read.repository';

jest.mock('../../../../src/infrastructure/models/booking.model', () => ({
  BookingModel: { exists: jest.fn() },
}));

const mockExists = (BookingModel as unknown as { exists: jest.Mock }).exists;

describe('BookingUsageReadRepository', () => {
  let repository: BookingUsageReadRepository;

  beforeEach(() => {
    repository = new BookingUsageReadRepository();
    jest.clearAllMocks();
  });

  it('should query bookings by category name at booking and item level', async () => {
    mockExists.mockResolvedValueOnce({ _id: 'booking-1' });

    const result = await repository.isCategoryUsed('Electronics');

    expect(mockExists).toHaveBeenCalledWith({
      $or: [{ category: 'Electronics' }, { 'items.category': 'Electronics' }],
    });
    expect(result).toBe(true);
  });

  it('should return false when no booking uses the category', async () => {
    mockExists.mockResolvedValueOnce(null);

    const result = await repository.isCategoryUsed('Electronics');

    expect(result).toBe(false);
  });
});
