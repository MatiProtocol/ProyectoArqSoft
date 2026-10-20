import { UserRoleDTO } from '../../../../src/application/dtos/enums/user-role.dto';
import type { UserRolesDTO } from '../../../../src/application/dtos/user-roles.dto';
import { GetRolesUserHandler } from '../../../../src/application/queries/get-roles-user-handler';
import { GetRolesUserQuery } from '../../../../src/application/queries/get-roles-user-query';
import type { IUserReadRepository } from '../../../../src/domain/repositories/user.read.repository';

describe('GetRolesUserHandler', () => {
  let handler: GetRolesUserHandler;
  let mockRepository: jest.Mocked<IUserReadRepository>;
  const auth0Sub = 'auth0|12345';
  const mockUserRoles: UserRolesDTO = {
    id: auth0Sub,
    roles: [UserRoleDTO.ADMIN, UserRoleDTO.CLIENT_INDIVIDUAL],
  };

  beforeEach(() => {
    mockRepository = {
      findAuthDataByAuth0Id: jest.fn(),
    };
    handler = new GetRolesUserHandler(mockRepository);
  });

  describe('execute', () => {
    const query = new GetRolesUserQuery(auth0Sub);

    it('should return user roles when user exists in repository', async () => {
      mockRepository.findAuthDataByAuth0Id.mockResolvedValue(mockUserRoles);

      const result = await handler.execute(query);

      expect(mockRepository.findAuthDataByAuth0Id).toHaveBeenCalledTimes(1);
      expect(mockRepository.findAuthDataByAuth0Id).toHaveBeenCalledWith(auth0Sub);
      expect(result).toEqual(mockUserRoles);
    });

    it('should throw an error with status 401 when user is not found', async () => {
      mockRepository.findAuthDataByAuth0Id.mockResolvedValue(null);

      await expect(handler.execute(query)).rejects.toThrow('User not registered');

      try {
        await handler.execute(query);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toBe('User not registered');
          expect((error as { status?: number }).status).toBe(401);
        }
      }

      expect(mockRepository.findAuthDataByAuth0Id).toHaveBeenCalledWith(auth0Sub);
    });

    it('should propagate any error thrown by the repository', async () => {
      const dbError = new Error('Database connection failed');
      mockRepository.findAuthDataByAuth0Id.mockRejectedValue(dbError);

      await expect(handler.execute(query)).rejects.toThrow('Database connection failed');
      expect(mockRepository.findAuthDataByAuth0Id).toHaveBeenCalledWith(auth0Sub);
    });
  });
});
