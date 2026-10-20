import type { ICompanyPreregistrationReadRepository } from '../../../application/contracts/company-preregistration.read.repository';
import type { CompanyPreregistrationReadDto } from '../../../application/dtos/company-preregistration-read.dto';
import { CompanyPreregistrationModel } from '../../models/company-preregistration.model';
import { toCompanyPreregistrationReadDto } from '../mappers/company-preregistration-read.mapper';

export class CompanyPreregistrationReadRepository implements ICompanyPreregistrationReadRepository {
  async getByCompanyUserId(
    companyUserId: string
  ): Promise<CompanyPreregistrationReadDto | undefined> {
    const preregistration = await CompanyPreregistrationModel.findOne({ companyUserId }).lean();

    if (!preregistration) return undefined;

    return toCompanyPreregistrationReadDto(preregistration);
  }
}
