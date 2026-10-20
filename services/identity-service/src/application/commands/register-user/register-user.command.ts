import type { UserRole } from '../../../domain/enums/user-role';

export class RegisterUserCommand {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly city: string,
    public readonly roles?: UserRole[]
  ) {}
}
