export type CreateCompanyBookingItem = {
  registeredItemId: string;
};

export class CreateCompanyBookingCommand {
  constructor(
    public readonly userId: string,
    public readonly originId: string,
    public readonly destinationId: string,
    public readonly date: string,
    public readonly items: CreateCompanyBookingItem[]
  ) {}
}
