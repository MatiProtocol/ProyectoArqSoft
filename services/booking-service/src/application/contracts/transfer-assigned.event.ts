export type TransferAssignedEvent = {
  bookingId: string;
  transferId: number;
  vehicleId: number;
  deviceId: string;
  driverId: string;
  vehicleLabel?: string;
  driverName?: string;
  status: 'assigned';
  assignedAt: string;
};
