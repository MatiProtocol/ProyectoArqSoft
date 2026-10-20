import { UserRoleDto } from '../../../../src/application/dtos/enums/user-role';
import { UserRole } from '../../../../src/domain/enums/user-role';
import { UserModel } from '../../../../src/infrastructure/models/user.model';
import { UserReadRepository } from '../../../../src/infrastructure/repositories/user.read.repository';

jest.mock('../../../../src/infrastructure/models/user.model', () => ({
  UserModel: {
    findById: jest.fn(),
  },
}));

const mockedUserModel = UserModel as jest.Mocked<typeof UserModel>;

describe('UserReadRepository', () => {
  let repository: UserReadRepository;
  let mockSelect: jest.Mock;
  let mockLean: jest.Mock;
  let mockQuery: { select: jest.Mock; lean: jest.Mock };

  beforeEach(() => {
    repository = new UserReadRepository();
    jest.clearAllMocks();

    mockSelect = jest.fn().mockReturnThis();
    mockLean = jest.fn();
    mockQuery = { select: mockSelect, lean: mockLean };

    mockedUserModel.findById.mockReturnValue(mockQuery as never);
  });

  const validId = 'user_123';

  it('should return UserAuthDto when user is found', async () => {
    const mockDocument = {
      _id: validId,
      email: 'test@example.com',
      roles: [UserRoleDto.CLIENT_INDIVIDUAL, UserRoleDto.ADMIN],
    };
    mockLean.mockResolvedValue(mockDocument);

    const result = await repository.findAuthDataById(validId);

    expect(mockedUserModel.findById).toHaveBeenCalledWith(validId);
    expect(mockSelect).toHaveBeenCalledWith('_id email roles');
    expect(mockLean).toHaveBeenCalled();
    expect(result).toEqual({
      id: validId,
      email: mockDocument.email,
      roles: mockDocument.roles,
    });
  });

  it('should map roles to UserRoleDto correctly', async () => {
    const rawRoles = [UserRole.CLIENT_INDIVIDUAL, UserRole.ADMIN, UserRole.DRIVER];
    const mockDocument = {
      _id: validId,
      email: 'test@example.com',
      roles: rawRoles,
    };
    mockLean.mockResolvedValue(mockDocument);

    const result = await repository.findAuthDataById(validId);

    expect(result?.roles).toEqual(rawRoles);
    expect(result?.roles).toEqual(
      expect.arrayContaining([UserRoleDto.CLIENT_INDIVIDUAL, UserRoleDto.ADMIN, UserRoleDto.DRIVER])
    );
  });

  it('should return null when user is not found', async () => {
    mockLean.mockResolvedValue(null);

    const result = await repository.findAuthDataById(validId);

    expect(result).toBeNull();
    expect(mockSelect).toHaveBeenCalled();
    expect(mockLean).toHaveBeenCalled();
  });

  it('should return full user detail when user is found', async () => {
    const mockDocument = {
      _id: validId,
      email: 'test@example.com',
      roles: [UserRoleDto.CLIENT_INDIVIDUAL],
      name: 'Test User',
      phone: '099123456',
      city: 'Montevideo',
    };
    mockLean.mockResolvedValue(mockDocument);

    const result = await repository.findUserDetailById(validId);

    expect(mockedUserModel.findById).toHaveBeenCalledWith(validId);
    expect(mockSelect).toHaveBeenCalledWith('_id email roles name phone city');
    expect(result).toEqual({
      id: validId,
      email: 'test@example.com',
      roles: [UserRoleDto.CLIENT_INDIVIDUAL],
      name: 'Test User',
      phone: '099123456',
      city: 'Montevideo',
    });
  });

  it('should return null when full user detail is not found', async () => {
    mockLean.mockResolvedValue(null);

    const result = await repository.findUserDetailById(validId);

    expect(result).toBeNull();
    expect(mockSelect).toHaveBeenCalledWith('_id email roles name phone city');
  });

  it('should propagate database errors', async () => {
    const dbError = new Error('Database connection failed');
    mockLean.mockRejectedValue(dbError);

    await expect(repository.findAuthDataById(validId)).rejects.toThrow(
      'Database connection failed'
    );
    expect(mockedUserModel.findById).toHaveBeenCalledWith(validId);
  });
});
