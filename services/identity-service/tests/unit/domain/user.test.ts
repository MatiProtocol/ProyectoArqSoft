import { User } from '../../../src/domain/entities/user';
import { UserRole } from '../../../src/domain/enums/user-role';

describe('User entity', () => {
  const mockId = 'usr_123';
  const mockEmail = 'test@example.com';

  it('should create a user with only required fields', () => {
    const user = new User(mockId, mockEmail);

    expect(user.id).toBe(mockId);
    expect(user.email).toBe(mockEmail);
    expect(user.roles).toEqual([UserRole.CLIENT_INDIVIDUAL]);
    expect(user.name).toBeUndefined();
    expect(user.phone).toBeUndefined();
    expect(user.city).toBeUndefined();
  });

  it('should create a user with all fields', () => {
    const roles = [UserRole.ADMIN, UserRole.DRIVER];
    const expectedName = 'Test User';
    const expectedPhone = '+123456789';
    const expectedCity = 'Madrid';
    const user = new User(mockId, mockEmail, roles, expectedName, expectedPhone, expectedCity);

    expect(user.id).toBe(mockId);
    expect(user.email).toBe(mockEmail);
    expect(user.roles).toEqual(roles);
    expect(user.name).toBe(expectedName);
    expect(user.phone).toBe(expectedPhone);
    expect(user.city).toBe(expectedCity);
  });

  it('should allow empty roles array', () => {
    const user = new User(mockId, mockEmail, []);
    expect(user.roles).toEqual([]);
  });
});
