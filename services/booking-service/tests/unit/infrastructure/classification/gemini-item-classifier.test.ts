jest.mock('@move/logs-lib', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import type { CategoryCatalogClient } from '../../../../src/application/contracts/category-catalog';
import { GeminiItemClassifier } from '../../../../src/infrastructure/classification/gemini-item-classifier';

const mockGenerateContent = jest.fn();
const mockUpload = jest.fn();
const mockGetActiveCategories = jest.fn();

const mockClient = {
  models: {
    generateContent: mockGenerateContent,
  },
  files: {
    upload: mockUpload,
  },
};

const mockCategoryCatalogClient = {
  getActiveCategories: mockGetActiveCategories,
} as unknown as jest.Mocked<CategoryCatalogClient>;

const config = {
  apiKey: 'test-api-key',
  model: 'test-model',
  classificationPrompt: 'Classify these MOVE items and return strict JSON.',
  timeoutMs: 10000,
};

const defaultCategories = [
  { id: 1, nameEn: 'furniture', nameEs: 'Muebles', description: 'Home items' },
];

function buildClassifier(configOverride = config): GeminiItemClassifier {
  return new GeminiItemClassifier(configOverride, mockCategoryCatalogClient, mockClient);
}

describe('GeminiItemClassifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetActiveCategories.mockResolvedValue(defaultCategories);
    mockUpload.mockResolvedValue({ uri: 'files/category-catalog', mimeType: 'text/csv' });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should upload the MOVE category catalog and parse a recognized response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        recognized: true,
        items: [{ index: 0, category: 'furniture' }],
      }),
    });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(mockGetActiveCategories).toHaveBeenCalledTimes(1);
    expect(mockUpload).toHaveBeenCalledWith({
      file: expect.any(Blob),
      config: {
        mimeType: 'text/csv',
        displayName: 'move-category-catalog.csv',
      },
    });
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: config.model,
      contents: expect.objectContaining({
        parts: expect.arrayContaining([
          expect.objectContaining({
            fileData: expect.objectContaining({
              fileUri: 'files/category-catalog',
              mimeType: 'text/csv',
            }),
          }),
          expect.objectContaining({
            text: expect.stringContaining(config.classificationPrompt),
          }),
        ]),
      }),
    });
    expect(result).toEqual({
      recognized: true,
      items: [{ index: 0, category: 'furniture' }],
    });
  });

  it('should ignore extra fields from Gemini response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        recognized: true,
        items: [{ index: 0, category: 'furniture' }],
        reason: 'extra explanation',
      }),
    });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({
      recognized: true,
      items: [{ index: 0, category: 'furniture' }],
    });
  });

  it('should normalize recognized categories to the catalog canonical name', async () => {
    mockGetActiveCategories.mockResolvedValueOnce([
      { id: 1, nameEn: 'Furniture', nameEs: 'Muebles' },
    ]);
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        recognized: true,
        items: [{ index: 0, category: ' furniture ' }],
      }),
    });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({
      recognized: true,
      items: [{ index: 0, category: 'Furniture' }],
    });
  });

  it('should reject categories that are not present in the MOVE catalog', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        recognized: true,
        items: [{ index: 0, category: 'invented-category' }],
      }),
    });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({ recognized: false, items: [] });
  });

  it('should reuse the uploaded category catalog while the content is unchanged', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        text: JSON.stringify({
          recognized: true,
          items: [{ index: 0, category: 'furniture' }],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          recognized: true,
          items: [{ index: 0, category: 'furniture' }],
        }),
      });
    const classifier = buildClassifier();

    await classifier.classify([{ description: 'Mesa de madera' }]);
    await classifier.classify([{ description: 'Silla de madera' }]);

    expect(mockGetActiveCategories).toHaveBeenCalledTimes(2);
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it('should upload the category catalog again when the content changes', async () => {
    mockGenerateContent
      .mockResolvedValueOnce({
        text: JSON.stringify({
          recognized: true,
          items: [{ index: 0, category: 'furniture' }],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          recognized: true,
          items: [{ index: 0, category: 'boxes' }],
        }),
      });
    mockGetActiveCategories
      .mockResolvedValueOnce(defaultCategories)
      .mockResolvedValueOnce([...defaultCategories, { id: 2, nameEn: 'boxes', nameEs: 'Cajas' }]);
    mockUpload
      .mockResolvedValueOnce({ uri: 'files/category-catalog', mimeType: 'text/csv' })
      .mockResolvedValueOnce({ uri: 'files/category-catalog-2', mimeType: 'text/csv' });
    const classifier = buildClassifier();

    await classifier.classify([{ description: 'Mesa de madera' }]);
    await classifier.classify([{ description: 'Caja de carton' }]);

    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it('should upload the category catalog again when the Gemini file is close to expiration', async () => {
    const dateNow = jest.spyOn(Date, 'now');
    dateNow.mockReturnValue(1_000);
    mockGenerateContent
      .mockResolvedValueOnce({
        text: JSON.stringify({
          recognized: true,
          items: [{ index: 0, category: 'furniture' }],
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          recognized: true,
          items: [{ index: 0, category: 'furniture' }],
        }),
      });
    mockUpload
      .mockResolvedValueOnce({ uri: 'files/category-catalog', mimeType: 'text/csv' })
      .mockResolvedValueOnce({ uri: 'files/category-catalog-2', mimeType: 'text/csv' });
    const classifier = buildClassifier();

    await classifier.classify([{ description: 'Mesa de madera' }]);
    dateNow.mockReturnValue(47 * 60 * 60 * 1000 + 1_001);
    await classifier.classify([{ description: 'Silla de madera' }]);

    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it('should parse a not recognized response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        recognized: false,
        items: [],
      }),
    });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Objeto desconocido' }]);

    expect(result).toEqual({ recognized: false, items: [] });
  });

  it('should treat invalid JSON as not recognized', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'invalid-json' });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({ recognized: false, items: [] });
  });

  it('should treat an empty Gemini response as not recognized', async () => {
    mockGenerateContent.mockResolvedValueOnce({});
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({ recognized: false, items: [] });
  });

  it('should treat a response with invalid shape as not recognized', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ items: [{ index: 0, category: 'furniture' }] }),
    });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({ recognized: false, items: [] });
  });

  it('should treat a non-object JSON response as not recognized', async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: 'null' });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({ recognized: false, items: [] });
  });

  it('should parse a fenced JSON response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '```json\n{"recognized":true,"items":[{"index":0,"category":"furniture"}]}\n```',
    });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({
      recognized: true,
      items: [{ index: 0, category: 'furniture' }],
    });
  });

  it('should treat incomplete recognized responses as not recognized', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        recognized: true,
        items: [],
      }),
    });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({ recognized: false, items: [] });
  });

  it('should treat duplicate item indexes as not recognized', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        recognized: true,
        items: [
          { index: 0, category: 'furniture' },
          { index: 0, category: 'furniture' },
        ],
      }),
    });
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa' }, { description: 'Silla' }]);

    expect(result).toEqual({ recognized: false, items: [] });
  });

  it('should treat Gemini errors as not recognized', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini failed'));
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({ recognized: false, items: [] });
  });

  it('should treat catalog errors as not recognized', async () => {
    mockGetActiveCategories.mockRejectedValueOnce(new Error('Configuration failed'));
    const classifier = buildClassifier();

    const result = await classifier.classify([{ description: 'Mesa de madera' }]);

    expect(result).toEqual({ recognized: false, items: [] });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('should treat Gemini timeout as not recognized', async () => {
    jest.useFakeTimers();
    mockGenerateContent.mockReturnValueOnce(new Promise(() => undefined));
    const classifier = buildClassifier({
      ...config,
      timeoutMs: 10,
    });

    const classification = classifier.classify([{ description: 'Objeto desconocido' }]);
    await jest.advanceTimersByTimeAsync(10);

    await expect(classification).resolves.toEqual({ recognized: false, items: [] });
  });

  it('should allow constructing the classifier with the default Gemini client', () => {
    const classifier = new GeminiItemClassifier(config, mockCategoryCatalogClient);

    expect(classifier).toBeDefined();
  });
});
