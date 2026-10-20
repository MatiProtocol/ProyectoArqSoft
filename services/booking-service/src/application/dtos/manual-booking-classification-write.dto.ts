export type ManualBookingClassificationItemWriteDto = {
  itemId: string;
  category: string;
};

export type ManualBookingClassificationWriteDto = {
  items: ManualBookingClassificationItemWriteDto[];
};
