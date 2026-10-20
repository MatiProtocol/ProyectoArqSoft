import { incrementBusinessEvent } from '@move/logs-lib';
import type { Request, Response } from 'express';
import { RegisterUserCommand } from '../../../../src/application/commands/register-user/register-user.command';
import type { RegisterUserHandler } from '../../../../src/application/commands/register-user/register-user.handler';
import { UserRole } from '../../../../src/domain/enums/user-role';
import { RegisterController } from '../../../../src/presentation/controllers/register.controller';

jest.mock('@move/logs-lib', () => ({
  incrementBusinessEvent: jest.fn(),
}));

async function expectError<T>(
  promise: Promise<T>,
  expectedStatus: number,
  expectedMessage: string
): Promise<void> {
  try {
    await promise;
    fail('Expected error was not thrown');
  } catch (error: any) {
    expect(error.status).toBe(expectedStatus);
    expect(error.message).toBe(expectedMessage);
  }
}

const mockExecute = jest.fn();
const mockHandler = {
  execute: mockExecute,
} as unknown as jest.Mocked<RegisterUserHandler>;

const mockIncrementBusinessEvent = incrementBusinessEvent as jest.Mock;

describe('RegisterController', () => {
  let controller: RegisterController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new RegisterController(mockHandler);
    req = {
      user: {
        id: 'auth0|test-user-id',
        roles: [],
      },
      body: {
        email: 'test@example.com',
        name: 'John Doe',
        phone: '123456789',
        city: 'Uruguay',
        roles: ['client_individual'],
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
    mockIncrementBusinessEvent.mockClear();
  });

  describe('register - success', () => {
    it('should successfully register a user and return 201 status', async () => {
      mockExecute.mockResolvedValueOnce(undefined);

      await controller.register(req as Request, res as Response);

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith(expect.any(RegisterUserCommand));

      const commandArg = mockExecute.mock.calls[0][0];
      expect(commandArg.id).toBe('auth0|test-user-id');
      expect(commandArg.email).toBe('test@example.com');
      expect(commandArg.name).toBe('John Doe');
      expect(commandArg.phone).toBe('123456789');
      expect(commandArg.city).toBe('Uruguay');
      expect(commandArg.roles).toEqual([UserRole.CLIENT_INDIVIDUAL]);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'User registered successfully' });

      expect(mockIncrementBusinessEvent).toHaveBeenCalledTimes(1);
      expect(mockIncrementBusinessEvent).toHaveBeenCalledWith(
        'user_registered',
        'client_individual'
      );
    });

    it('should register successfully with no roles provided (uses default)', async () => {
      req.body.roles = undefined;
      mockExecute.mockResolvedValueOnce(undefined);

      await controller.register(req as Request, res as Response);

      const commandArg = mockExecute.mock.calls[0][0];
      expect(commandArg.roles).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(201);

      expect(mockIncrementBusinessEvent).toHaveBeenCalledWith(
        'user_registered',
        'client_individual'
      );
    });

    it('should register successfully with empty string roles (uses default)', async () => {
      req.body.roles = '';
      mockExecute.mockResolvedValueOnce(undefined);

      await controller.register(req as Request, res as Response);

      const commandArg = mockExecute.mock.calls[0][0];
      expect(commandArg.roles).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(201);

      expect(mockIncrementBusinessEvent).toHaveBeenCalledWith(
        'user_registered',
        'client_individual'
      );
    });

    it('should register successfully with null roles (uses default)', async () => {
      req.body.roles = null;
      mockExecute.mockResolvedValueOnce(undefined);

      await controller.register(req as Request, res as Response);

      const commandArg = mockExecute.mock.calls[0][0];
      expect(commandArg.roles).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(201);

      expect(mockIncrementBusinessEvent).toHaveBeenCalledWith(
        'user_registered',
        'client_individual'
      );
    });

    it('should register successfully with client_company role', async () => {
      req.body.roles = ['client_company'];
      mockExecute.mockResolvedValueOnce(undefined);

      await controller.register(req as Request, res as Response);

      const commandArg = mockExecute.mock.calls[0][0];
      expect(commandArg.roles).toEqual([UserRole.CLIENT_COMPANY]);
      expect(res.status).toHaveBeenCalledWith(201);

      expect(mockIncrementBusinessEvent).toHaveBeenCalledWith('user_registered', 'client_company');
    });

    it('should propagate errors thrown by the register handler', async () => {
      const error = new Error('Registration failed');
      mockExecute.mockRejectedValueOnce(error);

      await expect(controller.register(req as Request, res as Response)).rejects.toThrow(
        'Registration failed'
      );

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });
  });

  describe('register - sub validation', () => {
    it('should throw 400 if sub is missing from token', async () => {
      req.user = { id: '', roles: [] };

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'User identifier is required and cannot be empty or whitespace'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 if sub is a whitespace-only string', async () => {
      req.user = { id: '   ', roles: [] };

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'User identifier is required and cannot be empty or whitespace'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });
  });

  describe('register - email validation', () => {
    it('should throw 400 if email is empty', async () => {
      req.body.email = '';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'email is required and cannot be empty or whitespace'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 if email is whitespace only', async () => {
      req.body.email = '   ';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'email is required and cannot be empty or whitespace'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 if email has invalid format', async () => {
      req.body.email = 'not-an-email';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'Invalid email format'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });
  });

  describe('register - name validation', () => {
    it('should throw 400 if name is empty', async () => {
      req.body.name = '';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'name is required and cannot be empty or whitespace'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 if name is whitespace only', async () => {
      req.body.name = '   ';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'name is required and cannot be empty or whitespace'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });
  });

  describe('register - phone validation', () => {
    it('should throw 400 if phone is empty', async () => {
      req.body.phone = '';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'phone is required and cannot be empty or whitespace'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 if phone is whitespace only', async () => {
      req.body.phone = '   ';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'phone is required and cannot be empty or whitespace'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 if phone contains non-numeric characters', async () => {
      req.body.phone = '+12345678';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'Phone must be a numeric string of exactly 9 characters'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 if phone has fewer than 9 digits', async () => {
      req.body.phone = '12345678';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'Phone must be a numeric string of exactly 9 characters'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 if phone has more than 9 digits', async () => {
      req.body.phone = '1234567890';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'Phone must be a numeric string of exactly 9 characters'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });
  });

  describe('register - city validation', () => {
    it('should throw 400 if city is empty', async () => {
      req.body.city = '';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'city is required and cannot be empty or whitespace'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 if city is whitespace only', async () => {
      req.body.city = '   ';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'city is required and cannot be empty or whitespace'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });
  });

  describe('register - roles validation', () => {
    it('should throw 400 if a single role string is invalid', async () => {
      req.body.roles = 'superadmin';

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'Invalid role: superadmin'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 if any role in an array is invalid', async () => {
      req.body.roles = ['client_individual', 'unknown_role'];

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'Invalid role: unknown_role'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should accept client_individual as a standalone role', async () => {
      req.body.roles = ['client_individual'];
      mockExecute.mockResolvedValueOnce(undefined);

      await controller.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockIncrementBusinessEvent).toHaveBeenCalledWith(
        'user_registered',
        'client_individual'
      );
    });

    it('should accept client_company as a standalone role', async () => {
      req.body.roles = ['client_company'];
      mockExecute.mockResolvedValueOnce(undefined);

      await controller.register(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockIncrementBusinessEvent).toHaveBeenCalledWith('user_registered', 'client_company');
    });
  });

  describe('register - role compatibility validation', () => {
    const incompatibleWithCompany = [
      { label: 'client_individual', roles: ['client_company', 'client_individual'] },
      { label: 'driver', roles: ['client_company', 'driver'] },
      { label: 'operator', roles: ['client_company', 'operator'] },
      { label: 'admin', roles: ['client_company', 'admin'] },
    ];

    it.each(
      incompatibleWithCompany
    )('should throw 400 when client_company is combined with $label', async ({ roles }) => {
      req.body.roles = roles;

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'client_company cannot be combined with other roles'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 when client_company is combined with multiple other roles', async () => {
      req.body.roles = ['client_company', 'driver', 'admin'];

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'client_company cannot be combined with other roles'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 when admin or operator role is assigned by client', async () => {
      req.body.roles = ['admin'];

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'Admin and operator roles must be assigned by an administrator'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });

    it('should throw 400 when driver role is assigned by client', async () => {
      req.body.roles = ['driver'];

      await expectError(
        controller.register(req as Request, res as Response),
        400,
        'Driver role must be assigned by an administrator or operator'
      );
      expect(mockExecute).not.toHaveBeenCalled();
      expect(mockIncrementBusinessEvent).not.toHaveBeenCalled();
    });
  });
});
