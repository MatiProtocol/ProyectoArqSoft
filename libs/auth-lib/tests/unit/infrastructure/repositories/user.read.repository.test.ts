import type { Collection, Db } from 'mongodb';
import { UserRoleDTO } from '../../../../src/application/dtos/enums/user-role.dto';
import { UserReadRepository } from '../../../../src/infrastructure/repositories/user.read.repository';

const mockFindOne = jest.fn();
const mockCollection = {
  findOne: mockFindOne,
} as unknown as jest.Mocked<Collection>;

const mockDb = {
  collection: jest.fn().mockReturnValue(mockCollection),
} as unknown as jest.Mocked<Db>;

describe('UserReadRepository', () => {
  let repository: UserReadRepository;

  beforeEach(() => {
    repository = new UserReadRepository(mockDb);
    jest.clearAllMocks();
  });

  describe('findAuthDataByAuth0Id', () => {
    const auth0Id = 'auth0|123';
    const userDocument = {
      _id: auth0Id,
      roles: [UserRoleDTO.ADMIN, UserRoleDTO.CLIENT_INDIVIDUAL],
    };

    it('should return UserRolesDTO when user is found', async () => {
      mockFindOne.mockResolvedValueOnce(userDocument);

      const result = await repository.findAuthDataByAuth0Id(auth0Id);

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockFindOne).toHaveBeenCalledTimes(1);
      expect(mockFindOne).toHaveBeenCalledWith(
        { _id: auth0Id },
        { projection: { _id: 1, roles: 1 } }
      );
      expect(result).toEqual({
        id: userDocument._id,
        roles: userDocument.roles,
      });
    });

    it('should return null when user is not found', async () => {
      mockFindOne.mockResolvedValueOnce(null);

      const result = await repository.findAuthDataByAuth0Id(auth0Id);

      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockFindOne).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });

    it('should throw an error if database query fails', async () => {
      const dbError = new Error('MongoDB connection lost');
      mockFindOne.mockRejectedValueOnce(dbError);

      await expect(repository.findAuthDataByAuth0Id(auth0Id)).rejects.toThrow(
        'MongoDB connection lost'
      );
      expect(mockDb.collection).toHaveBeenCalledWith('users');
      expect(mockFindOne).toHaveBeenCalledTimes(1);
    });
  });
});
