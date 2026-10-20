import { logger } from '@move/logs-lib';
import type { IBookingWriteRepository } from '../../../domain/repositories/booking.write.repository';
import type { RecordAssignedResourcesCommand } from './record-assigned-resources.command';

export class RecordAssignedResourcesHandler {
  constructor(private readonly bookingWriteRepository: IBookingWriteRepository) {}

  async execute(command: RecordAssignedResourcesCommand): Promise<void> {
    const { bookingId, ...resources } = command.event;

    await this.bookingWriteRepository.recordAssignedResources(bookingId, resources);

    logger.info('Assigned resources recorded for booking', {
      bookingId,
      transferId: resources.transferId,
    });
  }
}
