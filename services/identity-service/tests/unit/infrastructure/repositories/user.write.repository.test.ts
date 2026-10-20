import { MongoServerError } from 'mongodb';
import { User } from '../../../../src/domain/entities/user';
import { UserRole } from '../../../../src/domain/enums/user-role';
import { UserModel } from '../../../../src/infrastructure/models/user.model';
import { UserWriteRepository } from '../../../../src/infrastructure/repositories/user.write.repository';

const mockSave = jest.fn();

jest.mock('../../../../src/infrastructure/models/user.model', () => {
  const ctor = jest.fn().mockImplementation(function (this: any, data: any) {
    this.data = data;
    this.save = mockSave;
    return this;
  });
  (ctor as any).updateOne = jest.fn();
  return { UserModel: ctor };
});

const mockUpdateOne = (UserModel as any).updateOne as jest.Mock;

describe('UserWriteRepository', () => {
  let repository: UserWriteRepository;

  beforeEach(() => {
    repository = new UserWriteRepository();
    jest.clearAllMocks();
  });

  it('should successfully instantiate UserModel and call save', async () => {
    const user = new User(
      'auth0|user-123',
      'test@example.com',
      [UserRole.CLIENT_INDIVIDUAL],
      'John Doe',
      '123456789',
      'Uruguay'
    );

    mockSave.mockResolvedValueOnce(undefined);

    await repository.create(user);

    expect(UserModel).toHaveBeenCalledTimes(1);
    expect(UserModel).toHaveBeenCalledWith({
      _id: 'auth0|user-123',
      email: 'test@example.com',
      roles: [UserRole.CLIENT_INDIVIDUAL],
      name: 'John Doe',
      phone: '123456789',
      city: 'Uruguay',
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('should propagate errors thrown by save', async () => {
    const user = new User(
      'auth0|user-123',
      'test@example.com',
      [UserRole.CLIENT_INDIVIDUAL],
      'John Doe',
      '123456789',
      'Uruguay'
    );

    const dbError = new Error('Mongoose validation failed');
    mockSave.mockRejectedValueOnce(dbError);

    await expect(repository.create(user)).rejects.toThrow('Mongoose validation failed');
    expect(UserModel).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('should throw email already exists error when MongoServerError code 11000 occurs', async () => {
    const user = new User(
      'auth0|user-123',
      'test@example.com',
      [UserRole.CLIENT_INDIVIDUAL],
      'John Doe',
      '123456789',
      'Uruguay'
    );

    const duplicateError = new MongoServerError({ message: 'Duplicate key error' });
    duplicateError.code = 11000;
    duplicateError.keyPattern = { email: 1 };
    mockSave.mockRejectedValueOnce(duplicateError);

    await expect(repository.create(user)).rejects.toMatchObject({
      message: 'Email already exists, please try to log in.',
      status: 400,
    });
  });

  it('should throw id already exists error when MongoServerError code 11000 occurs', async () => {
    const user = new User(
      'auth0|user-123',
      'test@example.com',
      [UserRole.CLIENT_INDIVIDUAL],
      'John Doe',
      '123456789',
      'Uruguay'
    );

    const duplicateError = new MongoServerError({ message: 'Duplicate key error' });
    duplicateError.code = 11000;
    duplicateError.keyPattern = { _id: 1 };
    mockSave.mockRejectedValueOnce(duplicateError);

    await expect(repository.create(user)).rejects.toMatchObject({
      message: 'This client ID is already registered.',
      status: 400,
    });
  });

  describe('updateRoles', () => {
    it('should call updateOne with $set and succeed when user exists', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repository.updateRoles('user_123', [UserRole.DRIVER]);

      expect(mockUpdateOne).toHaveBeenCalledTimes(1);
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: 'user_123' },
        { $set: { roles: [UserRole.DRIVER] } }
      );
    });

    it('should throw 404 if matchedCount is 0', async () => {
      mockUpdateOne.mockResolvedValueOnce({ matchedCount: 0 });

      const error = await repository.updateRoles('user_123', [UserRole.DRIVER]).catch((e) => e);
      expect(error.status).toBe(404);
      expect(error.message).toBe('User not found');
      expect(mockUpdateOne).toHaveBeenCalledTimes(1);
    });
  });
});
