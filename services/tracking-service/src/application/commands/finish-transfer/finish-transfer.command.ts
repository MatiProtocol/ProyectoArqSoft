import { parseNumericId } from '../../../domain/validate-numeric-id';

export class FinishTransferCommand {
  constructor(
    public readonly transferId: number,
    public readonly driverId: string
  ) {}

  static create(transferIdParam: string, driverId: string): FinishTransferCommand {
    return new FinishTransferCommand(parseNumericId(transferIdParam, 'Transfer'), driverId);
  }
}
