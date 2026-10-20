import { ErrorFactory } from '@move/errors-lib';
import { incrementBusinessEvent } from '@move/logs-lib';
import type { Request, Response } from 'express';
import { RegisterUserCommand } from '../../application/commands/register-user/register-user.command';
import type { RegisterUserHandler } from '../../application/commands/register-user/register-user.handler';
import { UserRole } from '../../domain/enums/user-role';

export class RegisterController {
  constructor(private readonly commandHandler: RegisterUserHandler) {}

  async register(req: Request, res: Response): Promise<void> {
    const sub = req.user?.id;
    if (typeof sub !== 'string' || sub.trim() === '') {
      throw ErrorFactory.badRequest(
        'User identifier is required and cannot be empty or whitespace'
      );
    }

    const { email, name, phone, city, roles } = req.body;

    if (typeof email !== 'string' || email.trim() === '') {
      throw ErrorFactory.badRequest('email is required and cannot be empty or whitespace');
    }
    if (typeof name !== 'string' || name.trim() === '') {
      throw ErrorFactory.badRequest('name is required and cannot be empty or whitespace');
    }
    if (typeof phone !== 'string' || phone.trim() === '') {
      throw ErrorFactory.badRequest('phone is required and cannot be empty or whitespace');
    }
    if (typeof city !== 'string' || city.trim() === '') {
      throw ErrorFactory.badRequest('city is required and cannot be empty or whitespace');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw ErrorFactory.badRequest('Invalid email format');
    }

    const phoneRegex = /^\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw ErrorFactory.badRequest('Phone must be a numeric string of exactly 9 characters');
    }

    let rolesArray: UserRole[] | undefined;
    if (roles !== undefined && roles !== null && roles !== '') {
      const arrayToValidate = Array.isArray(roles) ? roles : [roles];
      for (const r of arrayToValidate) {
        if (typeof r !== 'string' || !Object.values(UserRole).includes(r as UserRole)) {
          throw ErrorFactory.badRequest(`Invalid role: ${r}`);
        }
      }
      rolesArray = arrayToValidate as UserRole[];

      if (rolesArray.length > 1 && rolesArray.includes(UserRole.CLIENT_COMPANY)) {
        throw ErrorFactory.badRequest('client_company cannot be combined with other roles');
      }
      if (rolesArray.includes(UserRole.ADMIN) || rolesArray.includes(UserRole.OPERATOR)) {
        throw ErrorFactory.badRequest(
          'Admin and operator roles must be assigned by an administrator'
        );
      }
      if (rolesArray.includes(UserRole.DRIVER)) {
        throw ErrorFactory.badRequest(
          'Driver role must be assigned by an administrator or operator'
        );
      }
    }

    const command = new RegisterUserCommand(sub, email, name, phone, city, rolesArray);
    await this.commandHandler.execute(command);

    incrementBusinessEvent('user_registered', rolesArray?.[0] || 'client_individual');

    res.status(201).json({ message: 'User registered successfully' });
  }
}
