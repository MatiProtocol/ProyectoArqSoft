import type { Request, Response } from 'express';
import { AssignTransferCommand } from '../../application/commands/assign-transfer/assign-transfer.command';
import type { AssignTransferHandler } from '../../application/commands/assign-transfer/assign-transfer.handler';
import { FinishTransferCommand } from '../../application/commands/finish-transfer/finish-transfer.command';
import type { FinishTransferHandler } from '../../application/commands/finish-transfer/finish-transfer.handler';
import { StartTransferCommand } from '../../application/commands/start-transfer/start-transfer.command';
import type { StartTransferHandler } from '../../application/commands/start-transfer/start-transfer.handler';
import type { GetTransferPositionsHandler } from '../../application/queries/get-transfer-positions/get-transfer-positions.handler';
import { GetTransferPositionsQuery } from '../../application/queries/get-transfer-positions/get-transfer-positions.query';
import type { ListActiveTransfersHandler } from '../../application/queries/list-active-transfers/list-active-transfers.handler';
import { ListActiveTransfersQuery } from '../../application/queries/list-active-transfers/list-active-transfers.query';

export class TransferController {
  constructor(
    private readonly assignHandler: AssignTransferHandler,
    private readonly startHandler: StartTransferHandler,
    private readonly finishHandler: FinishTransferHandler,
    private readonly listActiveHandler: ListActiveTransfersHandler,
    private readonly getPositionsHandler: GetTransferPositionsHandler
  ) {}

  async assign(req: Request, res: Response): Promise<void> {
    const command = AssignTransferCommand.create(req.body);
    const transferId = await this.assignHandler.execute(command);

    res.status(201).json({ id: transferId, message: 'Transfer assigned successfully' });
  }

  async start(req: Request, res: Response): Promise<void> {
    const command = StartTransferCommand.create(req.params.id, req.user!.id);
    await this.startHandler.execute(command);

    res.status(200).json({ message: 'Transfer started successfully' });
  }

  async finish(req: Request, res: Response): Promise<void> {
    const command = FinishTransferCommand.create(req.params.id, req.user!.id);
    await this.finishHandler.execute(command);

    res.status(200).json({ message: 'Transfer finished successfully' });
  }

  async listActive(req: Request, res: Response): Promise<void> {
    const query = ListActiveTransfersQuery.fromQueryParams(req.query);
    const transfers = await this.listActiveHandler.execute(query);

    res.status(200).json(transfers);
  }

  async getPositions(req: Request, res: Response): Promise<void> {
    const query = GetTransferPositionsQuery.create(req.params.id, req.query);
    const positions = await this.getPositionsHandler.execute(query);

    res.status(200).json(positions);
  }
}
