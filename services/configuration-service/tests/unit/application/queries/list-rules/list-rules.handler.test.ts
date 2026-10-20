import { ListRulesHandler } from '../../../../../src/application/queries/list-rules/list-rules.handler';
import type { IRuleReadRepository } from '../../../../../src/domain/repositories/rule.read.repository';

describe('ListRulesHandler', () => {
  let mockReadRepository: jest.Mocked<IRuleReadRepository>;
  let handler: ListRulesHandler;

  beforeEach(() => {
    mockReadRepository = { getAll: jest.fn() };
    handler = new ListRulesHandler(mockReadRepository);
  });

  it('should delegate to the read repository', async () => {
    const rules = [
      { id: 1, type: 'MONITORING', description: 'monitoreo' },
      { id: 2, type: 'ALERTS', description: 'alertas' },
    ];
    mockReadRepository.getAll.mockResolvedValueOnce(rules);

    const result = await handler.execute();

    expect(mockReadRepository.getAll).toHaveBeenCalledTimes(1);
    expect(result).toBe(rules);
  });
});
