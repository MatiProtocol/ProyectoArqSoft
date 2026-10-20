import { ErrorFactory } from '@move/errors-lib';

export class ImportCategoriesCommand {
  constructor(public readonly csvContent: string) {}

  static create(file: Express.Multer.File | undefined): ImportCategoriesCommand {
    if (!file) {
      throw ErrorFactory.badRequest('A CSV file is required under field "file"');
    }

    return new ImportCategoriesCommand(file.buffer.toString('utf-8'));
  }
}
