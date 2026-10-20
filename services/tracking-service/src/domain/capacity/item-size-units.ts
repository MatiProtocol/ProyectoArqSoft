const SIZE_UNITS: Record<string, number> = {
  small: 1,
  medium: 2,
  large: 3,
};

const DEFAULT_UNITS = 1;

export function itemSizeToUnits(size?: string): number {
  if (!size) return DEFAULT_UNITS;
  return SIZE_UNITS[size.toLowerCase()] ?? DEFAULT_UNITS;
}

export function totalCapacityUnits(sizes: (string | undefined)[]): number {
  return sizes.reduce((total: number, size) => total + itemSizeToUnits(size), 0);
}
