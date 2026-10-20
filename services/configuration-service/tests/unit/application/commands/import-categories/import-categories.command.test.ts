import { ImportCategoriesCommand } from '../../../../../src/application/commands/import-categories/import-categories.command';

describe('ImportCategoriesCommand.create', () => {
  it('should build a command from the uploaded file buffer', () => {
    const file = {
      buffer: Buffer.from('id,category_name,category_name_es,description\n1,Sedan,Sedan,desc'),
    } as Express.Multer.File;

    const command = ImportCategoriesCommand.create(file);

    expect(command).toBeInstanceOf(ImportCategoriesCommand);
    expect(command.csvContent).toBe(
      'id,category_name,category_name_es,description\n1,Sedan,Sedan,desc'
    );
  });

  it('should throw 400 if no file is provided', () => {
    expect(() => ImportCategoriesCommand.create(undefined)).toThrow(
      expect.objectContaining({
        status: 400,
        message: 'A CSV file is required under field "file"',
      })
    );
  });
});
