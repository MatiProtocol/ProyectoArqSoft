import { ErrorFactory } from '@move/errors-lib';
import type { IUserReadRepository } from '../../contracts/user.read.repository';
import type { UserDetailDto } from '../../dtos/user-detail.dto';
import type { GetUserDetailQuery } from './get-user-detail-query';

export class GetUserDetailHandler {
  constructor(private readonly userRepository: IUserReadRepository) {}

  async execute(query: GetUserDetailQuery): Promise<UserDetailDto> {
    if (typeof query.userId !== 'string' || query.userId.trim() === '') {
      throw ErrorFactory.badRequest('userId is required and cannot be empty or whitespace');
    }

    const user = await this.userRepository.findUserDetailById(query.userId.trim());

    if (!user) {
      throw ErrorFactory.notFound('User');
    }

    return user;
  }
}
