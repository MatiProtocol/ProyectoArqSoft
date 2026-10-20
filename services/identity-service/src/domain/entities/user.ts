import { UserRole } from '../enums/user-role';

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly roles: UserRole[] = [UserRole.CLIENT_INDIVIDUAL],
    public readonly name?: string,
    public readonly phone?: string,
    public readonly city?: string
  ) {}
}
