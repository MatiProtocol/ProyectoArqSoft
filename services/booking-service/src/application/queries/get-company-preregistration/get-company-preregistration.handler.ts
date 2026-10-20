import { ErrorFactory } from '@move/errors-lib';
import type { ICompanyPreregistrationReadRepository } from '../../contracts/company-preregistration.read.repository';
import type { CompanyPreregistrationReadDto } from '../../dtos/company-preregistration-read.dto';
import type { GetCompanyPreregistrationQuery } from './get-company-preregistration.query';

export class GetCompanyPreregistrationHandler {
  constructor(private readonly readRepository: ICompanyPreregistrationReadRepository) {}

  async execute(query: GetCompanyPreregistrationQuery): Promise<CompanyPreregistrationReadDto> {
    if (typeof query.companyUserId !== 'string' || query.companyUserId.trim() === '') {
      throw ErrorFactory.badRequest('companyUserId is required and cannot be empty or whitespace');
    }

    const companyUserId = query.companyUserId.trim();
    const preregistration = await this.readRepository.getByCompanyUserId(companyUserId);

    if (!preregistration) {
      return {
        companyUserId,
        origins: [],
        destinations: [],
        items: [],
      };
    }

    return preregistration;
  }
}
