import { parseNumericId } from '../../../domain/validate-numeric-id';

export class StartTransferCommand {
  constructor(
    public readonly transferId: number,
    public readonly driverId: string
  ) {}

  static create(transferIdParam: string, driverId: string): StartTransferCommand {
    return new StartTransferCommand(parseNumericId(transferIdParam, 'Transfer'), driverId);
  }
}
