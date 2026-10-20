import { HttpIdentityUserClient } from '../../../../src/infrastructure/clients/identity-user.client';

describe('HttpIdentityUserClient', () => {
  const config = {
    baseUrl: 'http://identity-service:4001',
    internalToken: 'internal-token',
    timeoutMs: 5000,
  };

  it('should fetch user detail from identity service', async () => {
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'user_123',
          email: 'client@example.com',
          name: 'Client',
        }),
      } as unknown as Response);
    const client = new HttpIdentityUserClient(config);
    global.fetch = fetchMock;

    const user = await client.getUserDetail('user_123');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://identity-service:4001/api/v1/identity/internal/users/user_123',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'X-Internal-Service-Token': 'internal-token',
        },
      })
    );
    expect(user).toEqual({
      id: 'user_123',
      email: 'client@example.com',
    });
  });

  it('should reject invalid identity responses', async () => {
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ id: 'user_123' }),
      } as unknown as Response);
    const client = new HttpIdentityUserClient(config);
    global.fetch = fetchMock;

    await expect(client.getUserDetail('user_123')).rejects.toMatchObject({
      message:
        'External service "Identity service" failed: Identity service is temporarily unavailable',
    });
  });
});
