import { ErrorFactory } from '@move/errors-lib';

export class UpdateCategoryCommand {
  constructor(
    public readonly id: number,
    public readonly nameEs?: string,
    public readonly description?: string
  ) {}

  static create(idParam: string, body: unknown): UpdateCategoryCommand {
    if (!/^\d+$/.test(idParam)) {
      throw ErrorFactory.badRequest('Category id must be a positive integer');
    }

    const { nameEs, description } = (body ?? {}) as { nameEs?: unknown; description?: unknown };

    if (nameEs !== undefined && (typeof nameEs !== 'string' || nameEs.trim() === '')) {
      throw ErrorFactory.badRequest('nameEs cannot be empty or whitespace');
    }
    if (description !== undefined && typeof description !== 'string') {
      throw ErrorFactory.badRequest('description must be a string');
    }

    return new UpdateCategoryCommand(Number(idParam), nameEs, description);
  }
}
