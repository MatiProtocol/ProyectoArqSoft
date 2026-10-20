import type { Request, Response } from 'express';
import { IngestGpsReadingCommand } from '../../application/commands/ingest-gps-reading/ingest-gps-reading.command';
import type { IngestGpsReadingHandler } from '../../application/commands/ingest-gps-reading/ingest-gps-reading.handler';

export class GpsController {
  constructor(private readonly ingestHandler: IngestGpsReadingHandler) {}

  async ingest(req: Request, res: Response): Promise<void> {
    const command = IngestGpsReadingCommand.create(req.body);

    await this.ingestHandler.execute(command);

    res.status(202).json({ message: 'GPS reading accepted' });
  }
}
