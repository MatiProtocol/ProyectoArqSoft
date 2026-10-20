export type CompanyBookingItemWriteDto = {
  registeredItemId: string;
};

export type CompanyBookingWriteDto = {
  originId: string;
  destinationId: string;
  date: string;
  items: CompanyBookingItemWriteDto[];
};
