import type { Request, Response } from 'express';
import { ClaimManualClassificationCommand } from '../../application/commands/claim-manual-classification/claim-manual-classification.command';
import type { ClaimManualClassificationHandler } from '../../application/commands/claim-manual-classification/claim-manual-classification.handler';
import {
  ManualClassifyBookingCommand,
  type ManualClassifyBookingItem,
} from '../../application/commands/manual-classify-booking/manual-classify-booking.command';
import type { ManualClassifyBookingHandler } from '../../application/commands/manual-classify-booking/manual-classify-booking.handler';
import { RejectManualClassificationCommand } from '../../application/commands/reject-manual-classification/reject-manual-classification.command';
import type { RejectManualClassificationHandler } from '../../application/commands/reject-manual-classification/reject-manual-classification.handler';
import type { ManualBookingClassificationWriteDto } from '../../application/dtos/manual-booking-classification-write.dto';

export class ManualClassifyBookingController {
  constructor(
    private readonly commandHandler: ManualClassifyBookingHandler,
    private readonly claimHandler: ClaimManualClassificationHandler,
    private readonly rejectHandler: RejectManualClassificationHandler
  ) {}

  async claimNext(req: Request, res: Response): Promise<void> {
    const operatorUserId = req.user?.id ?? '';
    const task = await this.claimHandler.execute(
      new ClaimManualClassificationCommand(operatorUserId)
    );

    if (!task) {
      res.status(204).send();
      return;
    }

    res.status(200).json(task);
  }

  async classify(req: Request, res: Response): Promise<void> {
    const body = req.body as ManualBookingClassificationWriteDto;
    const bookingId = req.params.bookingId;
    const operatorUserId = req.user?.id ?? '';

    const command = new ManualClassifyBookingCommand(
      bookingId,
      operatorUserId,
      body.items as unknown as ManualClassifyBookingItem[]
    );

    await this.commandHandler.execute(command);

    res.status(200).json({ message: 'Booking manually classified successfully' });
  }

  async reject(req: Request, res: Response): Promise<void> {
    const bookingId = req.params.bookingId;
    const operatorUserId = req.user?.id ?? '';

    await this.rejectHandler.execute(
      new RejectManualClassificationCommand(bookingId, operatorUserId)
    );

    res.status(200).json({ message: 'Booking rejected successfully' });
  }
}
