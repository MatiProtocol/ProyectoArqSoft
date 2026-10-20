import { QueueNames } from '../../../../src/infrastructure/queues/queue-names';

describe('QueueNames', () => {
  it('defines the names for the BullMQ queues', () => {
    expect(QueueNames).toEqual({
      GPS_INGEST: 'gps-ingest',
      ALERT_DETECTION: 'alert-detection',
      NOTIFICATION: 'notification-queue',
      TRANSFER_ASSIGNED: 'transfer-assigned',
    });
  });
});
