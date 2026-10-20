import { parseNumericId } from '../../../domain/validate-numeric-id';

export class DeleteZoneCommand {
  constructor(public readonly id: number) {}

  static create(idParam: string): DeleteZoneCommand {
    return new DeleteZoneCommand(parseNumericId(idParam, 'Zone'));
  }
}
