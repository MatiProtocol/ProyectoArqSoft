export type Coordinates = [number, number];

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (!Array.isArray(value) || value.length !== 2) return false;

  const [lng, lat] = value;
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (Number.isNaN(lng) || Number.isNaN(lat)) return false;

  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}
