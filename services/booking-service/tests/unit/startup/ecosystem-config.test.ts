describe('booking-service ecosystem.config.js', () => {
  it('registers the transfer assigned worker process', () => {
    const ecosystem = require('../../../ecosystem.config');

    expect(ecosystem.apps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'booking-transfer-assigned-worker',
          script: 'dist/transfer-assigned-worker.js',
          exec_mode: 'fork',
          instances: 1,
        }),
      ])
    );
  });
});
