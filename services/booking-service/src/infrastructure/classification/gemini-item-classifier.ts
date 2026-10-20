import { createPartFromUri, createUserContent, GoogleGenAI } from '@google/genai';
import { logger } from '@move/logs-lib';
import type { CreateBookingItem } from '../../application/commands/create-booking/create-booking.command';
import type {
  CategoryCatalogClient,
  CategoryCatalogItem,
} from '../../application/contracts/category-catalog';
import type {
  ItemClassificationResult,
  ItemClassifier,
} from '../../application/contracts/item-classifier';
import {
  createExternalServiceCircuitBreaker,
  type ExternalServiceCircuitBreaker,
} from '../circuit-breakers/external-service-circuit-breaker';
import type { GeminiConfig } from '../config/gemini';

const CATEGORY_CATALOG_MIME_TYPE = 'text/csv';
const CATEGORY_CATALOG_FILE_NAME = 'move-category-catalog.csv';
const CATEGORY_CATALOG_RENEW_AFTER_MS = 47 * 60 * 60 * 1000;

type GeminiClient = {
  models: {
    generateContent(input: { model: string; contents: unknown }): Promise<{ text?: string }>;
  };
  files: {
    upload(input: {
      file: Blob;
      config: { mimeType: string; displayName: string };
    }): Promise<{ uri?: string; mimeType?: string }>;
  };
};

type GeminiResponse = {
  text?: string;
};

type UploadedCategoryCatalog = {
  uri: string;
  mimeType: string;
  csvContent: string;
  categories: CategoryCatalogItem[];
  uploadedAt: number;
};

export class GeminiItemClassifier implements ItemClassifier {
  private readonly client: GeminiClient;
  private readonly geminiBreaker: ExternalServiceCircuitBreaker<[() => Promise<unknown>], unknown>;
  private uploadedCatalog: UploadedCategoryCatalog | undefined;

  constructor(
    private readonly config: GeminiConfig,
    private readonly categoryCatalogClient: CategoryCatalogClient,
    client?: GeminiClient
  ) {
    this.client = (client ?? new GoogleGenAI({ apiKey: config.apiKey })) as GeminiClient;
    this.geminiBreaker = createExternalServiceCircuitBreaker(
      async (request: () => Promise<unknown>) => request(),
      {
        name: 'gemini',
        serviceName: 'Gemini',
        timeoutMs: config.timeoutMs,
        fallbackMessage: 'Gemini classification service is temporarily unavailable',
        retryAfter: '30s',
      }
    );
  }

  async classify(items: CreateBookingItem[]): Promise<ItemClassificationResult> {
    try {
      const catalogFile = await this.getCatalogFile();
      const geminiRequest = this.geminiBreaker.fire(() =>
        this.client.models.generateContent({
          model: this.config.model,
          contents: createUserContent([
            createPartFromUri(catalogFile.uri, catalogFile.mimeType),
            this.buildPrompt(items),
          ]),
        })
      ) as Promise<GeminiResponse>;
      const response = await this.waitForGeminiResponse(geminiRequest);

      return this.parseResponse(response.text, items.length, catalogFile.categories);
    } catch (error) {
      logger.warn('Gemini item classification unavailable', {
        model: this.config.model,
        itemCount: items.length,
        error: error instanceof Error ? error.message : String(error),
      });
      return { recognized: false, items: [] };
    }
  }

  private async getCatalogFile(): Promise<UploadedCategoryCatalog> {
    const categories = await this.categoryCatalogClient.getActiveCategories();

    if (categories.length === 0) {
      throw new Error('No active MOVE categories are available');
    }

    const csvContent = this.buildCategoryCsv(categories);
    if (this.canReuseCatalogFile(csvContent) && this.uploadedCatalog) {
      return this.uploadedCatalog;
    }

    const uploadedFile = (await this.geminiBreaker.fire(() =>
      this.client.files.upload({
        file: new Blob([csvContent], { type: CATEGORY_CATALOG_MIME_TYPE }),
        config: {
          mimeType: CATEGORY_CATALOG_MIME_TYPE,
          displayName: CATEGORY_CATALOG_FILE_NAME,
        },
      })
    )) as { uri?: string; mimeType?: string };

    if (!uploadedFile.uri) {
      throw new Error('Gemini did not return a category catalog file URI');
    }

    this.uploadedCatalog = {
      uri: uploadedFile.uri,
      mimeType: uploadedFile.mimeType ?? CATEGORY_CATALOG_MIME_TYPE,
      csvContent,
      categories,
      uploadedAt: Date.now(),
    };

    return this.uploadedCatalog;
  }

  private canReuseCatalogFile(csvContent: string): boolean {
    return (
      this.uploadedCatalog !== undefined &&
      this.uploadedCatalog.csvContent === csvContent &&
      Date.now() - this.uploadedCatalog.uploadedAt < CATEGORY_CATALOG_RENEW_AFTER_MS
    );
  }

  private async waitForGeminiResponse(
    geminiRequest: Promise<GeminiResponse>
  ): Promise<GeminiResponse> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeout = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Gemini classification timed out')),
        this.config.timeoutMs
      );
    });

    try {
      return await Promise.race([geminiRequest, timeout]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private buildPrompt(items: CreateBookingItem[]): string {
    const itemDescriptions = items.map((item, index) => ({
      index,
      description: item.description,
    }));

    return `${this.config.classificationPrompt}\n${JSON.stringify(itemDescriptions)}`;
  }

  private parseResponse(
    responseText: string | undefined,
    expectedItemCount: number,
    validCategories: CategoryCatalogItem[]
  ): ItemClassificationResult {
    if (!responseText) return { recognized: false, items: [] };

    try {
      const parsed = JSON.parse(this.cleanJsonResponse(responseText));
      const canonicalCategoryByName = new Map(
        validCategories.map((category) => [
          this.normalizeCategory(category.nameEn),
          category.nameEn,
        ])
      );

      if (!this.isValidResult(parsed, expectedItemCount, canonicalCategoryByName)) {
        return { recognized: false, items: [] };
      }

      return {
        recognized: parsed.recognized,
        items: parsed.recognized
          ? parsed.items.map((item: { index: number; category: string }) => ({
              index: item.index,
              category: canonicalCategoryByName.get(this.normalizeCategory(item.category))!,
            }))
          : [],
      };
    } catch {
      return { recognized: false, items: [] };
    }
  }

  private cleanJsonResponse(responseText: string): string {
    return responseText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '');
  }

  private isValidResult(
    value: unknown,
    expectedItemCount: number,
    canonicalCategoryByName: Map<string, string>
  ): value is ItemClassificationResult {
    if (!value || typeof value !== 'object') return false;

    const result = value as ItemClassificationResult;

    if (typeof result.recognized !== 'boolean' || !Array.isArray(result.items)) return false;

    if (!result.recognized) return true;

    if (result.items.length !== expectedItemCount) return false;

    const indexes = new Set<number>();

    return result.items.every(
      (item) =>
        Number.isInteger(item.index) &&
        item.index >= 0 &&
        item.index < expectedItemCount &&
        !indexes.has(item.index) &&
        indexes.add(item.index) &&
        typeof item.category === 'string' &&
        item.category.trim() !== '' &&
        canonicalCategoryByName.has(this.normalizeCategory(item.category))
    );
  }

  private normalizeCategory(category: string): string {
    return category.trim().toLowerCase();
  }

  private buildCategoryCsv(categories: CategoryCatalogItem[]): string {
    const rows = categories.map((category) =>
      [category.id, category.nameEn, category.nameEs, category.description ?? '']
        .map((value) => this.escapeCsvValue(String(value)))
        .join(',')
    );

    return ['id,category_name,category_name_es,description', ...rows].join('\n');
  }

  private escapeCsvValue(value: string): string {
    if (!/[",\n\r]/.test(value)) return value;

    return `"${value.replace(/"/g, '""')}"`;
  }
}
