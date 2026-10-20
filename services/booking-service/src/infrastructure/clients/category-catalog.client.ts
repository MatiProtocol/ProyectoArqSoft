import type {
  CategoryCatalogClient,
  CategoryCatalogItem,
} from '../../application/contracts/category-catalog';
import {
  createExternalServiceCircuitBreaker,
  type ExternalServiceCircuitBreaker,
} from '../circuit-breakers/external-service-circuit-breaker';
import type { CategoryCatalogConfig } from '../config/category-catalog';

const CATEGORY_CATALOG_PATH = '/api/v1/configuration/categories/catalog';

export class HttpCategoryCatalogClient implements CategoryCatalogClient {
  private readonly categoryCatalogBreaker: ExternalServiceCircuitBreaker<[], CategoryCatalogItem[]>;

  constructor(private readonly config: CategoryCatalogConfig) {
    this.categoryCatalogBreaker = createExternalServiceCircuitBreaker(
      () => this.fetchActiveCategories(),
      {
        name: 'categoryCatalog',
        serviceName: 'Configuration service',
        timeoutMs: config.timeoutMs,
        fallbackMessage: 'Category catalog service is temporarily unavailable',
        retryAfter: '30s',
      }
    );
  }

  async getActiveCategories(): Promise<CategoryCatalogItem[]> {
    return this.categoryCatalogBreaker.fire();
  }

  private async fetchActiveCategories(): Promise<CategoryCatalogItem[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${CATEGORY_CATALOG_PATH}`, {
        method: 'GET',
        headers: {
          'X-Internal-Service-Token': this.config.internalToken,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Configuration service returned ${response.status}`);
      }

      return this.parseCatalog(await response.json());
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseCatalog(value: unknown): CategoryCatalogItem[] {
    if (!Array.isArray(value)) {
      throw new Error('Configuration service returned an invalid category catalog');
    }

    return value.map((item) => this.parseCatalogItem(item));
  }

  private parseCatalogItem(value: unknown): CategoryCatalogItem {
    if (!value || typeof value !== 'object') {
      throw new Error('Configuration service returned an invalid category item');
    }

    const item = value as {
      id?: unknown;
      nameEn?: unknown;
      nameEs?: unknown;
      description?: unknown;
      rules?: unknown;
    };

    if (
      !Number.isInteger(item.id) ||
      typeof item.nameEn !== 'string' ||
      item.nameEn.trim() === '' ||
      typeof item.nameEs !== 'string' ||
      item.nameEs.trim() === '' ||
      (item.description !== undefined && typeof item.description !== 'string')
    ) {
      throw new Error('Configuration service returned an invalid category item');
    }

    return {
      id: item.id as number,
      nameEn: item.nameEn,
      nameEs: item.nameEs,
      description: item.description,
      rules: Array.isArray(item.rules)
        ? (item.rules as { id: number; type: string }[]).filter(
            (r) =>
              typeof r === 'object' &&
              r !== null &&
              Number.isInteger(r.id) &&
              typeof r.type === 'string'
          )
        : [],
    };
  }
}
