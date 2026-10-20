import { parseNumericId } from '../../../domain/validate-numeric-id';

export class DeleteVehicleCommand {
  constructor(public readonly id: number) {}

  static create(idParam: string): DeleteVehicleCommand {
    return new DeleteVehicleCommand(parseNumericId(idParam, 'Vehicle'));
  }
}
