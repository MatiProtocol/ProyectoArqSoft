import { ErrorFactory } from '@move/errors-lib';
import { logger } from '@move/logs-lib';
import { Types } from 'mongoose';
import type { IBookingWriteRepository } from '../../../domain/repositories/booking.write.repository';
import type { CustomerEmailPublisher } from '../../contracts/customer-email.publisher';
import type { CustomerProfileClient } from '../../contracts/customer-profile.client';
import type { ManualClassificationQueue } from '../../contracts/manual-classification-queue';
import type { RejectManualClassificationCommand } from './reject-manual-classification.command';

export class RejectManualClassificationHandler {
  constructor(
    private readonly writeRepository: IBookingWriteRepository,
    private readonly manualClassificationQueue: ManualClassificationQueue,
    private readonly customerProfileClient: CustomerProfileClient,
    private readonly customerEmailPublisher: CustomerEmailPublisher
  ) {}

  async execute(command: RejectManualClassificationCommand): Promise<void> {
    this.validate(command);

    const bookingId = command.bookingId.trim();
    const operatorUserId = command.operatorUserId.trim();

    await this.manualClassificationQueue.ensureClaimedBy(bookingId, operatorUserId);
    const booking = await this.writeRepository.getPendingClassification(bookingId);
    const customerProfile = await this.customerProfileClient.getUserDetail(booking.userId);
    await this.writeRepository.deletePendingClassification(bookingId);
    const itemDescriptions = booking.items.map((item) => item.description);
    await this.customerEmailPublisher.publishBookingRejected({
      bookingId,
      userId: booking.userId,
      to: customerProfile.email,
      subject: 'No pudimos procesar tu solicitud en MOVE',
      bodyText: this.createRejectedBookingBodyText(itemDescriptions),
      itemDescriptions,
    });
    await this.manualClassificationQueue.complete(bookingId, operatorUserId);

    logger.info('Booking rejected, removed and customer notification queued', {
      bookingId,
      operatorUserId,
      userId: booking.userId,
    });
  }

  private validate(command: RejectManualClassificationCommand): void {
    if (
      typeof command.bookingId !== 'string' ||
      command.bookingId.trim() === '' ||
      !Types.ObjectId.isValid(command.bookingId.trim())
    ) {
      throw ErrorFactory.badRequest('bookingId must be a valid id');
    }

    if (typeof command.operatorUserId !== 'string' || command.operatorUserId.trim() === '') {
      throw ErrorFactory.badRequest('operatorUserId is required and cannot be empty or whitespace');
    }
  }

  private createRejectedBookingBodyText(itemDescriptions: string[]): string {
    const descriptionText = itemDescriptions.join(', ');

    return [
      'Hola,',
      '',
      'Gracias por contactar a MOVE.',
      `Lamentamos informarte que, segun la descripcion que proporcionaste: ${descriptionText}, tu solicitud esta fuera de los servicios que actualmente manejamos.`,
      'Estamos trabajando para expandir nuestra oferta de servicios.',
      '',
      'Saludos cordiales,',
      'El equipo de MOVE',
    ].join('\n');
  }
}
