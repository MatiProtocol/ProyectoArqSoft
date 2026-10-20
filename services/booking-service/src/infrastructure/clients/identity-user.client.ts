import { ErrorFactory } from '@move/errors-lib';
import type {
  CustomerProfile,
  CustomerProfileClient,
} from '../../application/contracts/customer-profile.client';
import {
  createExternalServiceCircuitBreaker,
  type ExternalServiceCircuitBreaker,
} from '../circuit-breakers/external-service-circuit-breaker';
import type { IdentityServiceConfig } from '../config/identity-service';

const INTERNAL_USER_PATH = '/api/v1/identity/internal/users';

export class HttpIdentityUserClient implements CustomerProfileClient {
  private readonly identityServiceBreaker: ExternalServiceCircuitBreaker<[string], CustomerProfile>;

  constructor(private readonly config: IdentityServiceConfig) {
    this.identityServiceBreaker = createExternalServiceCircuitBreaker(
      (userId: string) => this.fetchUserDetail(userId),
      {
        name: 'identityService',
        serviceName: 'Identity service',
        timeoutMs: config.timeoutMs,
        fallbackMessage: 'Identity service is temporarily unavailable',
        retryAfter: '30s',
      }
    );
  }

  async getUserDetail(userId: string): Promise<CustomerProfile> {
    return this.identityServiceBreaker.fire(userId);
  }

  private async fetchUserDetail(userId: string): Promise<CustomerProfile> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(
        `${this.config.baseUrl}${INTERNAL_USER_PATH}/${encodeURIComponent(userId)}`,
        {
          method: 'GET',
          headers: {
            'X-Internal-Service-Token': this.config.internalToken,
          },
          signal: controller.signal,
        }
      ).catch((error: unknown) => {
        throw ErrorFactory.externalService(
          'Identity service',
          error instanceof Error ? error.message : 'Identity service request failed',
          error instanceof Error ? error : undefined
        );
      });

      if (!response.ok) {
        throw ErrorFactory.externalService(
          'Identity service',
          `Identity service returned ${response.status}`,
          undefined,
          { status: response.status }
        );
      }

      const userDetail = (await response.json()) as { email?: unknown };

      if (typeof userDetail.email !== 'string' || userDetail.email.trim() === '') {
        throw ErrorFactory.externalService(
          'Identity service',
          'Identity service returned no email'
        );
      }

      return {
        id: userId,
        email: userDetail.email,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
