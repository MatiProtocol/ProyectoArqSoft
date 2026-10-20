export type ManualClassifyBookingItem = {
  itemId: string;
  category: string;
};

export class ManualClassifyBookingCommand {
  constructor(
    public readonly bookingId: string,
    public readonly operatorUserId: string,
    public readonly items: ManualClassifyBookingItem[]
  ) {}
}
