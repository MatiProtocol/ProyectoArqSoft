export class RejectManualClassificationCommand {
  constructor(
    public readonly bookingId: string,
    public readonly operatorUserId: string
  ) {}
}
