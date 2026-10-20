import { DeleteZoneCommand } from '../../../../../src/application/commands/delete-zone/delete-zone.command';

describe('DeleteZoneCommand.create', () => {
  it('should build a command for a valid numeric id', () => {
    expect(DeleteZoneCommand.create('42').id).toBe(42);
  });

  it('should throw 400 for a non-numeric id', () => {
    expect(() => DeleteZoneCommand.create('abc')).toThrow(expect.objectContaining({ status: 400 }));
  });
});
