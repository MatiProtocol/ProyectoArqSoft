import type { BookingRejectedEmail } from '../../../../src/application/contracts/customer-email-notifier';
import { GmailCustomerEmailNotifier } from '../../../../src/infrastructure/notifications/gmail-customer-email-notifier';

describe('GmailCustomerEmailNotifier', () => {
  const payload: BookingRejectedEmail = {
    bookingId: 'booking-id',
    userId: 'user-id',
    to: 'client@example.com',
    subject: 'No pudimos procesar tu solicitud en MOVE',
    bodyText:
      'Hola,\n\nLamentamos informarte que, segun la descripcion que proporcionaste: Objeto <no> soportado, tu solicitud esta fuera de los servicios que actualmente manejamos.',
    itemDescriptions: ['Objeto <no> soportado'],
  };

  const config = {
    user: 'move@example.com',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    refreshToken: 'refresh-token',
    timeoutMs: 5000,
  };

  let getAccessToken: jest.Mock;
  let setCredentials: jest.Mock;
  let createTransport: jest.Mock;
  let sendMail: jest.Mock;

  beforeEach(() => {
    getAccessToken = jest.fn().mockResolvedValue({ token: 'access-token' });
    setCredentials = jest.fn();
    sendMail = jest.fn().mockResolvedValue({ messageId: 'message-id' });
    createTransport = jest.fn(() => ({ sendMail }));
  });

  function createNotifier(): GmailCustomerEmailNotifier {
    return new GmailCustomerEmailNotifier(
      config,
      {
        google: {
          auth: {
            OAuth2: jest.fn().mockImplementation(() => ({
              setCredentials,
              getAccessToken,
            })),
          },
        },
      },
      { createTransport } as never
    );
  }

  it('should create a Gmail OAuth transporter and send the rejection email', async () => {
    const notifier = createNotifier();

    await notifier.notifyBookingRejected(payload);

    expect(setCredentials).toHaveBeenCalledWith({
      refresh_token: 'refresh-token',
    });
    expect(createTransport).toHaveBeenCalledWith({
      service: 'gmail',
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
      auth: {
        type: 'OAuth2',
        user: 'move@example.com',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        refreshToken: 'refresh-token',
        accessToken: 'access-token',
      },
    });
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Equipo MOVE" <move@example.com>',
        to: 'client@example.com',
        subject: 'No pudimos procesar tu solicitud en MOVE',
        html: expect.stringContaining('Objeto &lt;no&gt; soportado'),
      })
    );
  });

  it('should fail when Gmail OAuth does not return an access token', async () => {
    getAccessToken.mockResolvedValueOnce({ token: undefined });
    const notifier = createNotifier();

    await expect(notifier.notifyBookingRejected(payload)).rejects.toMatchObject({
      message: 'External service "Gmail" failed: Gmail email service is temporarily unavailable',
    });
    expect(sendMail).not.toHaveBeenCalled();
  });
});
