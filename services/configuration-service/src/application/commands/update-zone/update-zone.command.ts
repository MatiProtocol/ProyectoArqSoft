import { ErrorFactory } from '@move/errors-lib';
import { ZoneType } from '../../../domain/enums/zone-type';
import { assertValidRing } from '../../../domain/geo/validate-ring';
import { parseNumericId } from '../../../domain/validate-numeric-id';

export class UpdateZoneCommand {
  constructor(
    public readonly id: number,
    public readonly name?: string,
    public readonly type?: ZoneType,
    public readonly coordinates?: [number, number][]
  ) {}

  static create(idParam: string, body: unknown): UpdateZoneCommand {
    const id = parseNumericId(idParam, 'Zone');

    const { name, type, coordinates } = (body ?? {}) as {
      name?: unknown;
      type?: unknown;
      coordinates?: unknown;
    };

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      throw ErrorFactory.badRequest('name cannot be empty or whitespace');
    }
    if (
      type !== undefined &&
      (typeof type !== 'string' || !Object.values(ZoneType).includes(type as ZoneType))
    ) {
      throw ErrorFactory.badRequest(`type must be one of: ${Object.values(ZoneType).join(', ')}`);
    }

    const ring = coordinates !== undefined ? assertValidRing(coordinates) : undefined;

    return new UpdateZoneCommand(id, name, type as ZoneType | undefined, ring);
  }
}
