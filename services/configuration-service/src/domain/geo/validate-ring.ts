import { ErrorFactory } from '@move/errors-lib';

const MIN_RING_POSITIONS = 4;
const LNG_MIN = -180;
const LNG_MAX = 180;
const LAT_MIN = -90;
const LAT_MAX = 90;

function isPosition(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    value[0] >= LNG_MIN &&
    value[0] <= LNG_MAX &&
    value[1] >= LAT_MIN &&
    value[1] <= LAT_MAX
  );
}

export function assertValidRing(value: unknown): [number, number][] {
  if (!Array.isArray(value) || value.length < MIN_RING_POSITIONS) {
    throw ErrorFactory.badRequest('coordinates must be a ring of at least 4 [lng, lat] positions');
  }

  if (!value.every(isPosition)) {
    throw ErrorFactory.badRequest('each coordinate must be a valid [lng, lat] pair');
  }

  const ring = value as [number, number][];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    throw ErrorFactory.badRequest('coordinates ring must be closed (first position equals last)');
  }

  return ring;
}
