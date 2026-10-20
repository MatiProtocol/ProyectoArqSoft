export type PayBookingResultDto = {
  bookingId: string;
  bookingStatus: string;
  payment: {
    status: string;
    amount: number;
    reference?: string;
    reason?: string;
  };
  retryQueued: boolean;
};
