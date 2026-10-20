import { CreateCategoryCommand } from '../../../../../src/application/commands/create-category/create-category.command';

describe('CreateCategoryCommand.create', () => {
  it('should build a command from a valid body', () => {
    const command = CreateCategoryCommand.create({
      nameEn: 'Luxury',
      nameEs: 'Lujo',
      description: 'High-end vehicles',
    });

    expect(command).toBeInstanceOf(CreateCategoryCommand);
    expect(command.nameEn).toBe('Luxury');
    expect(command.nameEs).toBe('Lujo');
    expect(command.description).toBe('High-end vehicles');
  });

  it('should build a command without an optional description', () => {
    const command = CreateCategoryCommand.create({ nameEn: 'Van', nameEs: 'Furgoneta' });

    expect(command.description).toBeUndefined();
  });

  it('should throw 400 if nameEn is missing', () => {
    expect(() => CreateCategoryCommand.create({ nameEs: 'Lujo' })).toThrow(
      expect.objectContaining({
        status: 400,
        message: 'nameEn is required and cannot be empty or whitespace',
      })
    );
  });

  it('should throw 400 if nameEn is whitespace only', () => {
    expect(() => CreateCategoryCommand.create({ nameEn: '   ', nameEs: 'Lujo' })).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it('should throw 400 if nameEs is missing', () => {
    expect(() => CreateCategoryCommand.create({ nameEn: 'Luxury' })).toThrow(
      expect.objectContaining({
        status: 400,
        message: 'nameEs is required and cannot be empty or whitespace',
      })
    );
  });

  it('should throw 400 if description is not a string', () => {
    expect(() =>
      CreateCategoryCommand.create({ nameEn: 'Luxury', nameEs: 'Lujo', description: 123 })
    ).toThrow(expect.objectContaining({ status: 400, message: 'description must be a string' }));
  });

  it('should throw 400 if body is undefined', () => {
    expect(() => CreateCategoryCommand.create(undefined)).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });

  it('should throw 400 if body is null', () => {
    expect(() => CreateCategoryCommand.create(null)).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});
