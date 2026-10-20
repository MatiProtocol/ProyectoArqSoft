import { User } from '../../../domain/entities/user';
import { UserRole } from '../../../domain/enums/user-role';
import type { IUserWriteRepository } from '../../../domain/repositories/user.write.repository';
import type { RegisterUserCommand } from './register-user.command';

export class RegisterUserHandler {
  constructor(private readonly writeRepository: IUserWriteRepository) {}

  async execute(command: RegisterUserCommand): Promise<void> {
    const roles =
      command.roles && command.roles.length > 0 ? command.roles : [UserRole.CLIENT_INDIVIDUAL];

    const user = new User(
      command.id,
      command.email,
      roles,
      command.name,
      command.phone,
      command.city
    );

    await this.writeRepository.create(user);
  }
}
