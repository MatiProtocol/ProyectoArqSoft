import { UpdateCategoryCommand } from '../../../../../src/application/commands/update-category/update-category.command';

describe('UpdateCategoryCommand.create', () => {
  it('should build a command with a numeric id parsed from the route param', () => {
    const command = UpdateCategoryCommand.create('42', {
      nameEs: 'Sedán',
      description: 'Updated',
    });

    expect(command).toBeInstanceOf(UpdateCategoryCommand);
    expect(command.id).toBe(42);
    expect(command.nameEs).toBe('Sedán');
    expect(command.description).toBe('Updated');
  });

  it('should allow updating only the description (nameEs undefined)', () => {
    const command = UpdateCategoryCommand.create('42', { description: 'Only description' });

    expect(command.nameEs).toBeUndefined();
    expect(command.description).toBe('Only description');
  });

  it('should throw 400 if the id is not a positive integer', () => {
    expect(() => UpdateCategoryCommand.create('abc', { nameEs: 'Sedán' })).toThrow(
      expect.objectContaining({
        status: 400,
        message: 'Category id must be a positive integer',
      })
    );
  });

  it('should throw 400 if nameEs is an empty/whitespace string', () => {
    expect(() => UpdateCategoryCommand.create('42', { nameEs: '   ' })).toThrow(
      expect.objectContaining({ status: 400, message: 'nameEs cannot be empty or whitespace' })
    );
  });

  it('should throw 400 if description is not a string', () => {
    expect(() => UpdateCategoryCommand.create('42', { description: 123 })).toThrow(
      expect.objectContaining({ status: 400, message: 'description must be a string' })
    );
  });

  it('should build a command when body is undefined (no fields to update)', () => {
    const command = UpdateCategoryCommand.create('42', undefined);

    expect(command.id).toBe(42);
    expect(command.nameEs).toBeUndefined();
    expect(command.description).toBeUndefined();
  });
});
