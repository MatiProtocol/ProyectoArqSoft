import type { Request, Response } from 'express';
import { CreateCategoryCommand } from '../../../../src/application/commands/create-category/create-category.command';
import type { CreateCategoryHandler } from '../../../../src/application/commands/create-category/create-category.handler';
import { ImportCategoriesCommand } from '../../../../src/application/commands/import-categories/import-categories.command';
import type { ImportCategoriesHandler } from '../../../../src/application/commands/import-categories/import-categories.handler';
import { SetCategoryRulesCommand } from '../../../../src/application/commands/set-category-rules/set-category-rules.command';
import type { SetCategoryRulesHandler } from '../../../../src/application/commands/set-category-rules/set-category-rules.handler';
import { UpdateCategoryCommand } from '../../../../src/application/commands/update-category/update-category.command';
import type { UpdateCategoryHandler } from '../../../../src/application/commands/update-category/update-category.handler';
import type { ListCategoriesHandler } from '../../../../src/application/queries/list-categories/list-categories.handler';
import { CategoryController } from '../../../../src/presentation/controllers/category.controller';

const mockCreateExecute = jest.fn();
const mockUpdateExecute = jest.fn();
const mockImportExecute = jest.fn();
const mockListExecute = jest.fn();
const mockSetRulesExecute = jest.fn();

const mockCreateHandler = {
  execute: mockCreateExecute,
} as unknown as jest.Mocked<CreateCategoryHandler>;
const mockUpdateHandler = {
  execute: mockUpdateExecute,
} as unknown as jest.Mocked<UpdateCategoryHandler>;
const mockImportHandler = {
  execute: mockImportExecute,
} as unknown as jest.Mocked<ImportCategoriesHandler>;
const mockListHandler = {
  execute: mockListExecute,
} as unknown as jest.Mocked<ListCategoriesHandler>;
const mockSetRulesHandler = {
  execute: mockSetRulesExecute,
} as unknown as jest.Mocked<SetCategoryRulesHandler>;

describe('CategoryController', () => {
  let controller: CategoryController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new CategoryController(
      mockCreateHandler,
      mockUpdateHandler,
      mockImportHandler,
      mockListHandler,
      mockSetRulesHandler
    );
    req = { body: {}, params: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  describe('listCatalog', () => {
    it('should execute the list query and return categories with 200', async () => {
      const categories = [
        { id: 1, nameEn: 'Furniture', nameEs: 'Muebles', description: 'Home items' },
      ];
      mockListExecute.mockResolvedValueOnce(categories);

      await controller.listCatalog(req as Request, res as Response);

      expect(mockListExecute).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(categories);
    });

    it('should propagate errors thrown by the list handler', async () => {
      mockListExecute.mockRejectedValueOnce(new Error('database unavailable'));

      await expect(controller.listCatalog(req as Request, res as Response)).rejects.toThrow(
        'database unavailable'
      );
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should execute the create command and return 201', async () => {
      req.body = { nameEn: 'Luxury', nameEs: 'Lujo', description: 'desc' };
      mockCreateExecute.mockResolvedValueOnce(undefined);

      await controller.create(req as Request, res as Response);

      expect(mockCreateExecute).toHaveBeenCalledWith(expect.any(CreateCategoryCommand));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Category created successfully' });
    });

    it('should propagate validation errors from the command factory without calling the handler', async () => {
      req.body = { nameEs: 'Lujo' };

      await expect(controller.create(req as Request, res as Response)).rejects.toMatchObject({
        status: 400,
      });
      expect(mockCreateExecute).not.toHaveBeenCalled();
    });

    it('should propagate errors thrown by the handler', async () => {
      req.body = { nameEn: 'Sedan', nameEs: 'Sedan' };
      const conflictError = Object.assign(new Error('Conflict'), { status: 409 });
      mockCreateExecute.mockRejectedValueOnce(conflictError);

      await expect(controller.create(req as Request, res as Response)).rejects.toMatchObject({
        status: 409,
      });
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should execute the update command and return 200', async () => {
      req.params = { id: '42' };
      req.body = { nameEs: 'Sedán' };
      mockUpdateExecute.mockResolvedValueOnce(undefined);

      await controller.update(req as Request, res as Response);

      expect(mockUpdateExecute).toHaveBeenCalledWith(expect.any(UpdateCategoryCommand));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Category updated successfully' });
    });

    it('should propagate validation errors from the command factory without calling the handler', async () => {
      req.params = { id: 'abc' };
      req.body = { nameEs: 'Sedán' };

      await expect(controller.update(req as Request, res as Response)).rejects.toMatchObject({
        status: 400,
      });
      expect(mockUpdateExecute).not.toHaveBeenCalled();
    });

    it('should propagate errors thrown by the handler', async () => {
      req.params = { id: '999' };
      req.body = { nameEs: 'Sedán' };
      const notFoundError = Object.assign(new Error('Not found'), { status: 404 });
      mockUpdateExecute.mockRejectedValueOnce(notFoundError);

      await expect(controller.update(req as Request, res as Response)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('importCsv', () => {
    it('should execute the import command and return the result with 200', async () => {
      req.file = {
        buffer: Buffer.from('id,category_name,category_name_es,description\n1,Sedan,Sedan,desc'),
      } as Express.Multer.File;
      const importResult = { inserted: 1, updated: 0, errors: [] };
      mockImportExecute.mockResolvedValueOnce(importResult);

      await controller.importCsv(req as Request, res as Response);

      expect(mockImportExecute).toHaveBeenCalledWith(expect.any(ImportCategoriesCommand));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(importResult);
    });

    it('should propagate validation errors from the command factory without calling the handler', async () => {
      req.file = undefined;

      await expect(controller.importCsv(req as Request, res as Response)).rejects.toMatchObject({
        status: 400,
      });
      expect(mockImportExecute).not.toHaveBeenCalled();
    });
  });

  describe('setRules', () => {
    it('should execute the set-rules command and return 200', async () => {
      req.params = { id: '7' };
      req.body = { rules: [2, 3] };
      mockSetRulesExecute.mockResolvedValueOnce(undefined);

      await controller.setRules(req as Request, res as Response);

      expect(mockSetRulesExecute).toHaveBeenCalledWith(expect.any(SetCategoryRulesCommand));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Category rules updated successfully' });
    });

    it('should propagate validation errors from the command factory without calling the handler', async () => {
      req.params = { id: '7' };
      req.body = { rules: 'not-an-array' };

      await expect(controller.setRules(req as Request, res as Response)).rejects.toMatchObject({
        status: 400,
      });
      expect(mockSetRulesExecute).not.toHaveBeenCalled();
    });

    it('should propagate errors thrown by the handler', async () => {
      req.params = { id: '7' };
      req.body = { rules: [2] };
      const conflictError = Object.assign(new Error('Frozen'), { status: 409 });
      mockSetRulesExecute.mockRejectedValueOnce(conflictError);

      await expect(controller.setRules(req as Request, res as Response)).rejects.toMatchObject({
        status: 409,
      });
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
