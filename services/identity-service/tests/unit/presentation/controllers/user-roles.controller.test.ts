import type { Request, Response } from 'express';
import { UpdateUserRolesCommand } from '../../../../src/application/commands/update-user-roles/update-user-roles.command';
import type { UpdateUserRolesHandler } from '../../../../src/application/commands/update-user-roles/update-user-roles.handler';
import { UserRole } from '../../../../src/domain/enums/user-role';
import { UserRolesController } from '../../../../src/presentation/controllers/user-roles.controller';

const mockExecute = jest.fn();
const mockHandler = {
  execute: mockExecute,
} as unknown as jest.Mocked<UpdateUserRolesHandler>;

describe('UserRolesController', () => {
  let controller: UserRolesController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new UserRolesController(mockHandler);
    req = {
      body: {
        targetUserId: 'target-user-id',
        roles: ['driver'],
      },
      user: {
        id: 'current-user-id',
        roles: [UserRole.ADMIN],
      },
    } as any;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe('updateRoles - success', () => {
    it('should successfully execute the command with roles array and return 200 status', async () => {
      mockExecute.mockResolvedValueOnce(undefined);

      await controller.updateRoles(req as Request, res as Response);

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith(expect.any(UpdateUserRolesCommand));

      const commandArg = mockExecute.mock.calls[0][0];
      expect(commandArg.targetUserId).toBe('target-user-id');
      expect(commandArg.newRoles).toEqual([UserRole.DRIVER]);
      expect(commandArg.currentUserRoles).toEqual([UserRole.ADMIN]);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Roles updated successfully' });
    });

    it('should successfully execute the command with a single role string and return 200 status', async () => {
      req.body.roles = 'operator';
      mockExecute.mockResolvedValueOnce(undefined);

      await controller.updateRoles(req as Request, res as Response);

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const commandArg = mockExecute.mock.calls[0][0];
      expect(commandArg.newRoles).toEqual([UserRole.OPERATOR]);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should propagate errors thrown by the handler', async () => {
      const error = Object.assign(new Error('User not found'), { status: 404 });
      mockExecute.mockRejectedValueOnce(error);

      await expect(controller.updateRoles(req as Request, res as Response)).rejects.toThrow(
        'User not found'
      );

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateRoles - validations', () => {
    it('should propagate validation errors thrown by the command factory without calling the handler', async () => {
      req.body.targetUserId = undefined;

      await expect(controller.updateRoles(req as Request, res as Response)).rejects.toMatchObject({
        status: 400,
        message: 'User ID is required and cannot be empty',
      });
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should forward the authenticated user roles to the command', async () => {
      mockExecute.mockResolvedValueOnce(undefined);

      await controller.updateRoles(req as Request, res as Response);

      const commandArg = mockExecute.mock.calls[0][0];
      expect(commandArg.currentUserRoles).toEqual([UserRole.ADMIN]);
    });
  });
});
