import { HttpCategoryCatalogClient } from '../../../../src/infrastructure/clients/category-catalog.client';

const mockFetch = jest.fn();

describe('HttpCategoryCatalogClient', () => {
  const config = {
    baseUrl: 'http://configuration-service:4003',
    internalToken: 'internal-token',
    timeoutMs: 5000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch and parse the category catalog from configuration-service', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest
        .fn()
        .mockResolvedValueOnce([
          { id: 1, nameEn: 'Furniture', nameEs: 'Muebles', description: 'Home items' },
        ]),
    });
    const client = new HttpCategoryCatalogClient(config);

    const result = await client.getActiveCategories();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://configuration-service:4003/api/v1/configuration/categories/catalog',
      expect.objectContaining({
        method: 'GET',
        headers: {
          'X-Internal-Service-Token': 'internal-token',
        },
      })
    );
    expect(result).toEqual([
      { id: 1, nameEn: 'Furniture', nameEs: 'Muebles', description: 'Home items', rules: [] },
    ]);
  });

  it('should throw when configuration-service returns an error status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const client = new HttpCategoryCatalogClient(config);

    await expect(client.getActiveCategories()).rejects.toThrow(
      'External service "Configuration service" failed: Category catalog service is temporarily unavailable'
    );
  });

  it('should throw when configuration-service returns an invalid catalog shape', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce({ invalid: true }),
    });
    const client = new HttpCategoryCatalogClient(config);

    await expect(client.getActiveCategories()).rejects.toThrow(
      'External service "Configuration service" failed: Category catalog service is temporarily unavailable'
    );
  });

  it('should throw when configuration-service returns an invalid category item', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce([{ id: '1', nameEn: 'Furniture', nameEs: 'Muebles' }]),
    });
    const client = new HttpCategoryCatalogClient(config);

    await expect(client.getActiveCategories()).rejects.toThrow(
      'External service "Configuration service" failed: Category catalog service is temporarily unavailable'
    );
  });
});
