import { ErrorFactory } from '@move/errors-lib';
import type { IUserReadRepository } from '../../domain/repositories/user.read.repository';
import type { UserRolesDTO } from '../dtos/user-roles.dto';
import type { GetRolesUserQuery } from './get-roles-user-query';

export class GetRolesUserHandler {
  constructor(private readonly userRepository: IUserReadRepository) {}

  async execute(query: GetRolesUserQuery): Promise<UserRolesDTO> {
    const user = await this.userRepository.findAuthDataByAuth0Id(query.sub);
    if (!user) {
      const error = Object.assign(ErrorFactory.unauthorized('User not registered'));
      throw error;
    }
    return user;
  }
}
