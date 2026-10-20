import type { Request, Response } from 'express';
import {
  AddCompanyPreregisteredItemCommand,
  AddCompanyPreregisteredLocationCommand,
  RemoveCompanyPreregisteredItemCommand,
  RemoveCompanyPreregisteredLocationCommand,
  UpdateCompanyPreregisteredItemCommand,
} from '../../../../src/application/commands/manage-company-preregistration/manage-company-preregistration.command';
import type { ManageCompanyPreregistrationHandler } from '../../../../src/application/commands/manage-company-preregistration/manage-company-preregistration.handler';
import type { GetCompanyPreregistrationHandler } from '../../../../src/application/queries/get-company-preregistration/get-company-preregistration.handler';
import { GetCompanyPreregistrationQuery } from '../../../../src/application/queries/get-company-preregistration/get-company-preregistration.query';
import { CompanyPreregistrationController } from '../../../../src/presentation/controllers/company-preregistration.controller';

const mockAddLocation = jest.fn();
const mockUpdateLocation = jest.fn();
const mockRemoveLocation = jest.fn();
const mockAddItem = jest.fn();
const mockUpdateItem = jest.fn();
const mockRemoveItem = jest.fn();
const mockCommandHandler = {
  addLocation: mockAddLocation,
  updateLocation: mockUpdateLocation,
  removeLocation: mockRemoveLocation,
  addItem: mockAddItem,
  updateItem: mockUpdateItem,
  removeItem: mockRemoveItem,
} as unknown as jest.Mocked<ManageCompanyPreregistrationHandler>;

const mockQueryExecute = jest.fn();
const mockQueryHandler = {
  execute: mockQueryExecute,
} as unknown as jest.Mocked<GetCompanyPreregistrationHandler>;

describe('CompanyPreregistrationController', () => {
  let controller: CompanyPreregistrationController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    controller = new CompanyPreregistrationController(mockCommandHandler, mockQueryHandler);
    req = {
      user: {
        id: 'auth0|company-id',
        roles: [],
      },
      params: {
        locationId: '507f1f77bcf86cd799439011',
        itemId: '507f1f77bcf86cd799439012',
      },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      sendStatus: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  it('should get preregistered company data for the authenticated company', async () => {
    const preregistration = {
      companyUserId: 'auth0|company-id',
      origins: [],
      destinations: [],
      items: [],
    };
    mockQueryExecute.mockResolvedValueOnce(preregistration);

    await controller.get(req as Request, res as Response);

    expect(mockQueryExecute).toHaveBeenCalledWith(expect.any(GetCompanyPreregistrationQuery));
    expect(mockQueryExecute.mock.calls[0][0].companyUserId).toBe('auth0|company-id');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(preregistration);
  });

  it('should add an origin from the request body', async () => {
    req.body = { coordinates: [-56.16, -34.9] };
    mockAddLocation.mockResolvedValueOnce({
      id: '507f1f77bcf86cd799439011',
      coordinates: [-56.16, -34.9],
    });

    await controller.addOrigin(req as Request, res as Response);

    expect(mockAddLocation).toHaveBeenCalledWith(
      expect.any(AddCompanyPreregisteredLocationCommand)
    );
    const command = mockAddLocation.mock.calls[0][0];
    expect(command.companyUserId).toBe('auth0|company-id');
    expect(command.kind).toBe('origin');
    expect(command.location).toEqual({ coordinates: [-56.16, -34.9] });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: '507f1f77bcf86cd799439011',
      coordinates: [-56.16, -34.9],
    });
  });

  it('should remove a destination with the route location id', async () => {
    mockRemoveLocation.mockResolvedValueOnce(undefined);

    await controller.removeDestination(req as Request, res as Response);

    expect(mockRemoveLocation).toHaveBeenCalledWith(
      expect.any(RemoveCompanyPreregisteredLocationCommand)
    );
    const command = mockRemoveLocation.mock.calls[0][0];
    expect(command.companyUserId).toBe('auth0|company-id');
    expect(command.kind).toBe('destination');
    expect(command.locationId).toBe('507f1f77bcf86cd799439011');
    expect(res.sendStatus).toHaveBeenCalledWith(204);
  });

  it('should add an item from the request body', async () => {
    req.body = {
      description: 'Cajas',
      category: 'Boxes',
      value: '500',
      size: 'small',
    };
    mockAddItem.mockResolvedValueOnce({
      id: '507f1f77bcf86cd799439012',
      description: 'Cajas',
      category: 'Boxes',
      value: '500',
      size: 'small',
    });

    await controller.addItem(req as Request, res as Response);

    expect(mockAddItem).toHaveBeenCalledWith(expect.any(AddCompanyPreregisteredItemCommand));
    const command = mockAddItem.mock.calls[0][0];
    expect(command.companyUserId).toBe('auth0|company-id');
    expect(command.item).toEqual(req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: '507f1f77bcf86cd799439012',
      description: 'Cajas',
      category: 'Boxes',
      value: '500',
      size: 'small',
    });
  });

  it('should update an item with the route item id', async () => {
    req.body = {
      description: 'Cajas chicas',
      category: 'Boxes',
    };
    mockUpdateItem.mockResolvedValueOnce(undefined);

    await controller.updateItem(req as Request, res as Response);

    expect(mockUpdateItem).toHaveBeenCalledWith(expect.any(UpdateCompanyPreregisteredItemCommand));
    const command = mockUpdateItem.mock.calls[0][0];
    expect(command.companyUserId).toBe('auth0|company-id');
    expect(command.itemId).toBe('507f1f77bcf86cd799439012');
    expect(command.item).toEqual(req.body);
    expect(res.sendStatus).toHaveBeenCalledWith(204);
  });

  it('should propagate handler errors', async () => {
    mockUpdateLocation.mockRejectedValueOnce(new Error('Location update failed'));

    await expect(controller.updateOrigin(req as Request, res as Response)).rejects.toThrow(
      'Location update failed'
    );

    expect(res.sendStatus).not.toHaveBeenCalled();
  });
});
