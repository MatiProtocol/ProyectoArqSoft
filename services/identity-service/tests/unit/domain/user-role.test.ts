import { UserRole } from '../../../src/domain/enums/user-role';

describe('UserRole enum', () => {
  it('should contain all expected roles with correct values', () => {
    expect(UserRole.CLIENT_COMPANY).toBe('client_company');
    expect(UserRole.CLIENT_INDIVIDUAL).toBe('client_individual');
    expect(UserRole.DRIVER).toBe('driver');
    expect(UserRole.OPERATOR).toBe('operator');
    expect(UserRole.ADMIN).toBe('admin');
  });

  it('should have exactly 5 roles', () => {
    const roleCount = Object.keys(UserRole).length;
    expect(roleCount).toBe(5);
  });
});
