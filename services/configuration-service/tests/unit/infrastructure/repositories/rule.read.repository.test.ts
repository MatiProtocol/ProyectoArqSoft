import { RuleModel } from '../../../../src/infrastructure/models/rule.model';
import { RuleReadRepository } from '../../../../src/infrastructure/repositories/rule.read.repository';

const mockLean = jest.fn();
const mockSort = jest.fn();

jest.mock('../../../../src/infrastructure/models/rule.model', () => ({
  RuleModel: { find: jest.fn() },
}));

const mockFind = (RuleModel as unknown as { find: jest.Mock }).find;

describe('RuleReadRepository', () => {
  let repository: RuleReadRepository;

  beforeEach(() => {
    repository = new RuleReadRepository();
    jest.clearAllMocks();
    mockSort.mockReturnValue({ lean: mockLean });
    mockFind.mockReturnValue({ sort: mockSort });
  });

  it('should query all rules sorted by id and map them to DTOs', async () => {
    mockLean.mockResolvedValueOnce([
      { _id: 1, type: 'MONITORING', description: 'monitoreo' },
      { _id: 3, type: 'SURCHARGE', description: undefined },
    ]);

    const result = await repository.getAll();

    expect(mockFind).toHaveBeenCalledWith({}, { _id: 1, type: 1, description: 1 });
    expect(mockSort).toHaveBeenCalledWith({ _id: 1 });
    expect(result).toEqual([
      { id: 1, type: 'MONITORING', description: 'monitoreo' },
      { id: 3, type: 'SURCHARGE', description: undefined },
    ]);
  });
});
