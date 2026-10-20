import { ErrorFactory } from '@move/errors-lib';
import type { ManualClassificationQueue } from '../../contracts/manual-classification-queue';
import type { ClaimManualClassificationCommand } from './claim-manual-classification.command';

export class ClaimManualClassificationHandler {
  constructor(private readonly manualClassificationQueue: ManualClassificationQueue) {}

  async execute(command: ClaimManualClassificationCommand) {
    if (typeof command.operatorUserId !== 'string' || command.operatorUserId.trim() === '') {
      throw ErrorFactory.badRequest('operatorUserId is required and cannot be empty or whitespace');
    }

    return this.manualClassificationQueue.claimNext(command.operatorUserId.trim());
  }
}
