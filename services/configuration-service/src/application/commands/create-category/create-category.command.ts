import { ErrorFactory } from '@move/errors-lib';

export class CreateCategoryCommand {
  constructor(
    public readonly nameEn: string,
    public readonly nameEs: string,
    public readonly description?: string
  ) {}

  static create(body: unknown): CreateCategoryCommand {
    const { nameEn, nameEs, description } = (body ?? {}) as {
      nameEn?: unknown;
      nameEs?: unknown;
      description?: unknown;
    };

    if (typeof nameEn !== 'string' || nameEn.trim() === '') {
      throw ErrorFactory.badRequest('nameEn is required and cannot be empty or whitespace');
    }
    if (typeof nameEs !== 'string' || nameEs.trim() === '') {
      throw ErrorFactory.badRequest('nameEs is required and cannot be empty or whitespace');
    }
    if (description !== undefined && typeof description !== 'string') {
      throw ErrorFactory.badRequest('description must be a string');
    }

    return new CreateCategoryCommand(nameEn, nameEs, description);
  }
}
