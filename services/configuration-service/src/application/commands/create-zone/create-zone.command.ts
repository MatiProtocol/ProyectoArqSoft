import { ErrorFactory } from '@move/errors-lib';
import { ZoneType } from '../../../domain/enums/zone-type';
import { assertValidRing } from '../../../domain/geo/validate-ring';

export class CreateZoneCommand {
  constructor(
    public readonly name: string,
    public readonly type: ZoneType,
    public readonly coordinates: [number, number][]
  ) {}

  static create(body: unknown): CreateZoneCommand {
    const { name, type, coordinates } = (body ?? {}) as {
      name?: unknown;
      type?: unknown;
      coordinates?: unknown;
    };

    if (typeof name !== 'string' || name.trim() === '') {
      throw ErrorFactory.badRequest('name is required and cannot be empty or whitespace');
    }
    if (typeof type !== 'string' || !Object.values(ZoneType).includes(type as ZoneType)) {
      throw ErrorFactory.badRequest(`type must be one of: ${Object.values(ZoneType).join(', ')}`);
    }

    const ring = assertValidRing(coordinates);

    return new CreateZoneCommand(name, type as ZoneType, ring);
  }
}
