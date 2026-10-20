import type { Request, Response } from 'express';
import type { ListRulesHandler } from '../../../../src/application/queries/list-rules/list-rules.handler';
import { RuleController } from '../../../../src/presentation/controllers/rule.controller';

const mockListExecute = jest.fn();
const mockListHandler = {
  execute: mockListExecute,
} as unknown as jest.Mocked<ListRulesHandler>;

describe('RuleController', () => {
  let controller: RuleController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new RuleController(mockListHandler);
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('should execute the list query and return rules with 200', async () => {
    const rules = [{ id: 1, type: 'MONITORING', description: 'monitoreo' }];
    mockListExecute.mockResolvedValueOnce(rules);

    await controller.list(req as Request, res as Response);

    expect(mockListExecute).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(rules);
  });

  it('should propagate errors thrown by the list handler', async () => {
    mockListExecute.mockRejectedValueOnce(new Error('database unavailable'));

    await expect(controller.list(req as Request, res as Response)).rejects.toThrow(
      'database unavailable'
    );
    expect(res.status).not.toHaveBeenCalled();
  });
});
