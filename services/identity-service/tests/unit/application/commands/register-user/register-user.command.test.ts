import { RegisterUserCommand } from '../../../../../src/application/commands/register-user/register-user.command';
import { UserRole } from '../../../../../src/domain/enums/user-role';

describe('RegisterUserCommand', () => {
  it('should correctly construct the command with all arguments', () => {
    const id = 'user_123';
    const email = 'test@example.com';
    const name = 'John Doe';
    const phone = '123456789';
    const city = 'Uruguay';
    const roles = [UserRole.CLIENT_INDIVIDUAL];

    const command = new RegisterUserCommand(id, email, name, phone, city, roles);

    expect(command.id).toBe(id);
    expect(command.email).toBe(email);
    expect(command.name).toBe(name);
    expect(command.phone).toBe(phone);
    expect(command.city).toBe(city);
    expect(command.roles).toEqual(roles);
  });

  it('should allow constructing the command without optional roles', () => {
    const id = 'user_123';
    const email = 'test@example.com';
    const name = 'John Doe';
    const phone = '123456789';
    const city = 'Uruguay';

    const command = new RegisterUserCommand(id, email, name, phone, city);

    expect(command.id).toBe(id);
    expect(command.email).toBe(email);
    expect(command.name).toBe(name);
    expect(command.phone).toBe(phone);
    expect(command.city).toBe(city);
    expect(command.roles).toBeUndefined();
  });
});
