export type QuoteBookingResultDto = {
  bookingId: string;
  distanceKm: number;
  baseCost: number;
  surchargePercent: number;
  estimatedCost: number;
  appliedRules: string[];
  status: string;
  degraded: boolean;
};
