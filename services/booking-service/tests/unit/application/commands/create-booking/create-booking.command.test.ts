import { CreateBookingCommand } from '../../../../../src/application/commands/create-booking/create-booking.command';
import { ItemSize } from '../../../../../src/domain/enums/item-size';
import type { Coordinates } from '../../../../../src/domain/value-objects/coordinates';

describe('CreateBookingCommand', () => {
  it('should correctly construct the command with all arguments', () => {
    const userId = 'usr_123';
    const origin: Coordinates = [-56.16, -34.9];
    const destination: Coordinates = [-56.03, -34.83];
    const date = '2026-07-10';
    const items = [
      {
        description: 'Mesa de madera',
        value: '1500',
        size: ItemSize.MEDIUM,
      },
    ];

    const command = new CreateBookingCommand(userId, origin, destination, date, items);

    expect(command.userId).toBe(userId);
    expect(command.origin).toBe(origin);
    expect(command.destination).toBe(destination);
    expect(command.date).toBe(date);
    expect(command.items).toEqual(items);
  });

  it('should allow constructing the command with items without optional fields', () => {
    const items = [{ description: 'Silla' }];

    const command = new CreateBookingCommand(
      'usr_123',
      [-56.16, -34.9],
      [-56.03, -34.83],
      '2026-07-10',
      items
    );

    expect(command.items).toEqual(items);
    expect(command.items[0].value).toBeUndefined();
    expect(command.items[0].size).toBeUndefined();
  });
});
