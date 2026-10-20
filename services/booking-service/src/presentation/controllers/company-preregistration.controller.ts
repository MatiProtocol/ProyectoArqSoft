import type { Request, Response } from 'express';
import {
  AddCompanyPreregisteredItemCommand,
  AddCompanyPreregisteredLocationCommand,
  type CompanyPreregistrationLocationKind,
  RemoveCompanyPreregisteredItemCommand,
  RemoveCompanyPreregisteredLocationCommand,
  UpdateCompanyPreregisteredItemCommand,
  UpdateCompanyPreregisteredLocationCommand,
} from '../../application/commands/manage-company-preregistration/manage-company-preregistration.command';
import type { ManageCompanyPreregistrationHandler } from '../../application/commands/manage-company-preregistration/manage-company-preregistration.handler';
import type {
  CompanyPreregisteredItemWriteDto,
  CompanyPreregisteredLocationWriteDto,
} from '../../application/dtos/company-preregistration-write.dto';
import type { GetCompanyPreregistrationHandler } from '../../application/queries/get-company-preregistration/get-company-preregistration.handler';
import { GetCompanyPreregistrationQuery } from '../../application/queries/get-company-preregistration/get-company-preregistration.query';

export class CompanyPreregistrationController {
  constructor(
    private readonly commandHandler: ManageCompanyPreregistrationHandler,
    private readonly queryHandler: GetCompanyPreregistrationHandler
  ) {}

  async get(req: Request, res: Response): Promise<void> {
    const preregistration = await this.queryHandler.execute(
      new GetCompanyPreregistrationQuery(req.user!.id)
    );

    res.status(200).json(preregistration);
  }

  async addOrigin(req: Request, res: Response): Promise<void> {
    await this.addLocation(req, res, 'origin');
  }

  async updateOrigin(req: Request, res: Response): Promise<void> {
    await this.updateLocation(req, res, 'origin');
  }

  async removeOrigin(req: Request, res: Response): Promise<void> {
    await this.removeLocation(req, res, 'origin');
  }

  async addDestination(req: Request, res: Response): Promise<void> {
    await this.addLocation(req, res, 'destination');
  }

  async updateDestination(req: Request, res: Response): Promise<void> {
    await this.updateLocation(req, res, 'destination');
  }

  async removeDestination(req: Request, res: Response): Promise<void> {
    await this.removeLocation(req, res, 'destination');
  }

  async addItem(req: Request, res: Response): Promise<void> {
    const item = await this.commandHandler.addItem(
      new AddCompanyPreregisteredItemCommand(
        req.user!.id,
        req.body as CompanyPreregisteredItemWriteDto
      )
    );

    res.status(201).json(item);
  }

  async updateItem(req: Request, res: Response): Promise<void> {
    await this.commandHandler.updateItem(
      new UpdateCompanyPreregisteredItemCommand(
        req.user!.id,
        req.params.itemId,
        req.body as CompanyPreregisteredItemWriteDto
      )
    );

    res.sendStatus(204);
  }

  async removeItem(req: Request, res: Response): Promise<void> {
    await this.commandHandler.removeItem(
      new RemoveCompanyPreregisteredItemCommand(req.user!.id, req.params.itemId)
    );

    res.sendStatus(204);
  }

  private async addLocation(
    req: Request,
    res: Response,
    kind: CompanyPreregistrationLocationKind
  ): Promise<void> {
    const location = await this.commandHandler.addLocation(
      new AddCompanyPreregisteredLocationCommand(
        req.user!.id,
        kind,
        req.body as CompanyPreregisteredLocationWriteDto
      )
    );

    res.status(201).json(location);
  }

  private async updateLocation(
    req: Request,
    res: Response,
    kind: CompanyPreregistrationLocationKind
  ): Promise<void> {
    await this.commandHandler.updateLocation(
      new UpdateCompanyPreregisteredLocationCommand(
        req.user!.id,
        kind,
        req.params.locationId,
        req.body as CompanyPreregisteredLocationWriteDto
      )
    );

    res.sendStatus(204);
  }

  private async removeLocation(
    req: Request,
    res: Response,
    kind: CompanyPreregistrationLocationKind
  ): Promise<void> {
    await this.commandHandler.removeLocation(
      new RemoveCompanyPreregisteredLocationCommand(req.user!.id, kind, req.params.locationId)
    );

    res.sendStatus(204);
  }
}
