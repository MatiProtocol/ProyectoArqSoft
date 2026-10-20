import { ErrorFactory } from '@move/errors-lib';
import { Types } from 'mongoose';
import type {
  CompanyPreregistrationLocationType,
  ICompanyPreregistrationWriteRepository,
} from '../../../application/contracts/company-preregistration.write.repository';
import type {
  CompanyPreregisteredItemReadDto,
  CompanyPreregisteredLocationReadDto,
} from '../../../application/dtos/company-preregistration-read.dto';
import type { CompanyPreregisteredItemWriteDto } from '../../../application/dtos/company-preregistration-write.dto';
import type { Coordinates } from '../../../domain/value-objects/coordinates';
import { CompanyPreregistrationModel } from '../../models/company-preregistration.model';

export class CompanyPreregistrationWriteRepository
  implements ICompanyPreregistrationWriteRepository
{
  async addLocation(
    companyUserId: string,
    type: CompanyPreregistrationLocationType,
    coordinates: Coordinates
  ): Promise<CompanyPreregisteredLocationReadDto> {
    const locationId = new Types.ObjectId();

    await CompanyPreregistrationModel.findOneAndUpdate(
      { companyUserId },
      {
        $setOnInsert: {
          _id: new Types.ObjectId(),
          companyUserId,
        },
        $push: {
          [type]: {
            _id: locationId,
            coordinates,
          },
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return {
      id: locationId.toString(),
      coordinates,
    };
  }

  async updateLocation(
    companyUserId: string,
    type: CompanyPreregistrationLocationType,
    locationId: string,
    coordinates: Coordinates
  ): Promise<void> {
    const preregistration = await CompanyPreregistrationModel.findOneAndUpdate(
      { companyUserId, [`${type}._id`]: locationId },
      {
        $set: {
          [`${type}.$.coordinates`]: coordinates,
        },
      }
    );

    if (!preregistration) {
      throw ErrorFactory.notFound('Company preregistered location', locationId);
    }
  }

  async removeLocation(
    companyUserId: string,
    type: CompanyPreregistrationLocationType,
    locationId: string
  ): Promise<void> {
    const preregistration = await CompanyPreregistrationModel.findOneAndUpdate(
      { companyUserId, [`${type}._id`]: locationId },
      {
        $pull: {
          [type]: {
            _id: locationId,
          },
        },
      }
    );

    if (!preregistration) {
      throw ErrorFactory.notFound('Company preregistered location', locationId);
    }
  }

  async addItem(
    companyUserId: string,
    item: CompanyPreregisteredItemWriteDto
  ): Promise<CompanyPreregisteredItemReadDto> {
    const itemId = new Types.ObjectId();

    await CompanyPreregistrationModel.findOneAndUpdate(
      { companyUserId },
      {
        $setOnInsert: {
          _id: new Types.ObjectId(),
          companyUserId,
        },
        $push: {
          items: {
            _id: itemId,
            description: item.description,
            category: item.category,
            value: item.value,
            size: item.size,
          },
        },
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    return {
      id: itemId.toString(),
      description: item.description,
      category: item.category,
      value: item.value,
      size: item.size,
    };
  }

  async updateItem(
    companyUserId: string,
    itemId: string,
    item: CompanyPreregisteredItemWriteDto
  ): Promise<void> {
    const update: {
      $set: Record<string, string | undefined>;
      $unset: Record<string, string>;
    } = {
      $set: {
        'items.$.description': item.description,
        'items.$.category': item.category,
      },
      $unset: {},
    };

    if (item.value === undefined) {
      update.$unset['items.$.value'] = '';
    } else {
      update.$set['items.$.value'] = item.value;
    }

    if (item.size === undefined) {
      update.$unset['items.$.size'] = '';
    } else {
      update.$set['items.$.size'] = item.size;
    }

    const preregistration = await CompanyPreregistrationModel.findOneAndUpdate(
      { companyUserId, 'items._id': itemId },
      update
    );

    if (!preregistration) {
      throw ErrorFactory.notFound('Company preregistered item', itemId);
    }
  }

  async removeItem(companyUserId: string, itemId: string): Promise<void> {
    const preregistration = await CompanyPreregistrationModel.findOneAndUpdate(
      { companyUserId, 'items._id': itemId },
      {
        $pull: {
          items: {
            _id: itemId,
          },
        },
      }
    );

    if (!preregistration) {
      throw ErrorFactory.notFound('Company preregistered item', itemId);
    }
  }
}
