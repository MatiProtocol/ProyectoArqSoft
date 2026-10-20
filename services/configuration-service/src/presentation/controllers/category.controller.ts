import type { Request, Response } from 'express';
import { CreateCategoryCommand } from '../../application/commands/create-category/create-category.command';
import type { CreateCategoryHandler } from '../../application/commands/create-category/create-category.handler';
import { ImportCategoriesCommand } from '../../application/commands/import-categories/import-categories.command';
import type { ImportCategoriesHandler } from '../../application/commands/import-categories/import-categories.handler';
import { SetCategoryRulesCommand } from '../../application/commands/set-category-rules/set-category-rules.command';
import type { SetCategoryRulesHandler } from '../../application/commands/set-category-rules/set-category-rules.handler';
import { UpdateCategoryCommand } from '../../application/commands/update-category/update-category.command';
import type { UpdateCategoryHandler } from '../../application/commands/update-category/update-category.handler';
import type { ListCategoriesHandler } from '../../application/queries/list-categories/list-categories.handler';

export class CategoryController {
  constructor(
    private readonly createHandler: CreateCategoryHandler,
    private readonly updateHandler: UpdateCategoryHandler,
    private readonly importHandler: ImportCategoriesHandler,
    private readonly listHandler: ListCategoriesHandler,
    private readonly setRulesHandler: SetCategoryRulesHandler
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    const command = CreateCategoryCommand.create(req.body);
    await this.createHandler.execute(command);

    res.status(201).json({ message: 'Category created successfully' });
  }

  async update(req: Request, res: Response): Promise<void> {
    const command = UpdateCategoryCommand.create(req.params.id, req.body);
    await this.updateHandler.execute(command);

    res.status(200).json({ message: 'Category updated successfully' });
  }

  async importCsv(req: Request, res: Response): Promise<void> {
    const command = ImportCategoriesCommand.create(req.file);
    const result = await this.importHandler.execute(command);

    res.status(200).json(result);
  }

  async setRules(req: Request, res: Response): Promise<void> {
    const command = SetCategoryRulesCommand.create(req.params.id, req.body);
    await this.setRulesHandler.execute(command);

    res.status(200).json({ message: 'Category rules updated successfully' });
  }

  async listCatalog(_req: Request, res: Response): Promise<void> {
    const categories = await this.listHandler.execute();

    res.status(200).json(categories);
  }
}
