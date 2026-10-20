import { ErrorFactory } from '@move/errors-lib';
import { logger } from '@move/logs-lib';
import { totalCapacityUnits } from '../../../domain/capacity/item-size-units';
import { Transfer } from '../../../domain/entities/transfer';
import { TransferStatus } from '../../../domain/enums/transfer-status';
import type { ITransferWriteRepository } from '../../../domain/repositories/transfer.write.repository';
import type { IBookingReadRepository } from '../../contracts/booking.read.repository';
import type { ITransferReadRepository } from '../../contracts/transfer.read.repository';
import type { ITransferAssignedPublisher } from '../../contracts/transfer-assigned.publisher';
import type { IVehicleReadRepository } from '../../contracts/vehicle.read.repository';
import type { AssignTransferCommand } from './assign-transfer.command';

const PAYABLE_BOOKING_STATUS = 'payed';

export class AssignTransferHandler {
  constructor(
    private readonly bookingReadRepository: IBookingReadRepository,
    private readonly vehicleReadRepository: IVehicleReadRepository,
    private readonly transferReadRepository: ITransferReadRepository,
    private readonly transferWriteRepository: ITransferWriteRepository,
    private readonly transferAssignedPublisher: ITransferAssignedPublisher
  ) {}

  async execute(command: AssignTransferCommand): Promise<number> {
    const booking = await this.bookingReadRepository.findById(command.bookingId);
    if (!booking) {
      throw ErrorFactory.notFound('Booking', command.bookingId);
    }

    if (booking.status !== PAYABLE_BOOKING_STATUS) {
      throw ErrorFactory.badRequest('Booking must be paid before assigning a transfer');
    }

    const vehicle = await this.vehicleReadRepository.findById(command.vehicleId);
    if (!vehicle) {
      throw ErrorFactory.notFound('Vehicle', command.vehicleId);
    }

    if (!vehicle.deviceId) {
      throw ErrorFactory.badRequest('Vehicle has no GPS device associated');
    }

    if (!vehicle.available) {
      throw ErrorFactory.conflict('Vehicle is not available');
    }

    const requiredUnits = totalCapacityUnits(booking.items.map((item) => item.size));
    if (requiredUnits > vehicle.capacity) {
      throw ErrorFactory.conflict(
        `Vehicle capacity (${vehicle.capacity}) is insufficient for the goods (${requiredUnits})`
      );
    }

    const vehicleBusy = await this.transferReadRepository.existsActiveForVehicle(command.vehicleId);
    if (vehicleBusy) {
      throw ErrorFactory.conflict('Vehicle is already assigned to an active transfer');
    }

    const transfer = new Transfer(
      booking.id,
      vehicle.id,
      vehicle.deviceId,
      command.driverId,
      booking.origin,
      booking.destination,
      booking.category,
      TransferStatus.ASSIGNED,
      vehicle.licensePlate,
      command.driverName,
      false
    );

    const transferId = await this.transferWriteRepository.create(transfer);
    await this.transferAssignedPublisher.publish({
      bookingId: booking.id,
      transferId,
      vehicleId: vehicle.id,
      deviceId: vehicle.deviceId,
      driverId: command.driverId,
      vehicleLabel: vehicle.licensePlate,
      driverName: command.driverName,
      status: 'assigned',
      assignedAt: new Date().toISOString(),
    });

    logger.info('Transfer assigned', {
      transferId,
      bookingId: booking.id,
      vehicleId: vehicle.id,
      driverId: command.driverId,
    });

    return transferId;
  }
}
