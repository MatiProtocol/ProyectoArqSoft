import { ErrorFactory } from '@move/errors-lib';
import { logger } from '@move/logs-lib';
import { Types } from 'mongoose';
import { type Coordinates, isValidCoordinates } from '../../../domain/value-objects/coordinates';
import type { CategoryCatalogClient, CategoryCatalogItem } from '../../contracts/category-catalog';
import type {
  CompanyPreregistrationLocationType,
  ICompanyPreregistrationWriteRepository,
} from '../../contracts/company-preregistration.write.repository';
import type {
  CompanyPreregisteredItemReadDto,
  CompanyPreregisteredLocationReadDto,
} from '../../dtos/company-preregistration-read.dto';
import type { CompanyPreregisteredItemWriteDto } from '../../dtos/company-preregistration-write.dto';
import { ItemSizeDto } from '../../dtos/enums/item-size.dto';
import type {
  AddCompanyPreregisteredItemCommand,
  AddCompanyPreregisteredLocationCommand,
  CompanyPreregistrationLocationKind,
  RemoveCompanyPreregisteredItemCommand,
  RemoveCompanyPreregisteredLocationCommand,
  UpdateCompanyPreregisteredItemCommand,
  UpdateCompanyPreregisteredLocationCommand,
} from './manage-company-preregistration.command';

export class ManageCompanyPreregistrationHandler {
  constructor(
    private readonly writeRepository: ICompanyPreregistrationWriteRepository,
    private readonly categoryCatalogClient: CategoryCatalogClient
  ) {}

  async addLocation(
    command: AddCompanyPreregisteredLocationCommand
  ): Promise<CompanyPreregisteredLocationReadDto> {
    this.validateCompanyUserId(command.companyUserId);
    this.validateLocationKind(command.kind);
    const coordinates = this.validateCoordinates(command.location?.coordinates);
    const location = await this.writeRepository.addLocation(
      command.companyUserId.trim(),
      this.toLocationType(command.kind),
      coordinates
    );

    logger.info('Company preregistered location added', {
      companyUserId: command.companyUserId,
      kind: command.kind,
      locationId: location.id,
    });

    return location;
  }

  async updateLocation(command: UpdateCompanyPreregisteredLocationCommand): Promise<void> {
    this.validateCompanyUserId(command.companyUserId);
    this.validateLocationKind(command.kind);
    this.validateObjectId(command.locationId, 'locationId');
    const coordinates = this.validateCoordinates(command.location?.coordinates);

    await this.writeRepository.updateLocation(
      command.companyUserId.trim(),
      this.toLocationType(command.kind),
      command.locationId.trim(),
      coordinates
    );

    logger.info('Company preregistered location updated', {
      companyUserId: command.companyUserId,
      kind: command.kind,
      locationId: command.locationId,
    });
  }

  async removeLocation(command: RemoveCompanyPreregisteredLocationCommand): Promise<void> {
    this.validateCompanyUserId(command.companyUserId);
    this.validateLocationKind(command.kind);
    this.validateObjectId(command.locationId, 'locationId');

    await this.writeRepository.removeLocation(
      command.companyUserId.trim(),
      this.toLocationType(command.kind),
      command.locationId.trim()
    );

    logger.info('Company preregistered location removed', {
      companyUserId: command.companyUserId,
      kind: command.kind,
      locationId: command.locationId,
    });
  }

  async addItem(
    command: AddCompanyPreregisteredItemCommand
  ): Promise<CompanyPreregisteredItemReadDto> {
    this.validateCompanyUserId(command.companyUserId);
    const item = await this.validateItem(command.item);
    const createdItem = await this.writeRepository.addItem(command.companyUserId.trim(), item);

    logger.info('Company preregistered item added', {
      companyUserId: command.companyUserId,
      itemId: createdItem.id,
      category: createdItem.category,
    });

    return createdItem;
  }

  async updateItem(command: UpdateCompanyPreregisteredItemCommand): Promise<void> {
    this.validateCompanyUserId(command.companyUserId);
    this.validateObjectId(command.itemId, 'itemId');
    const item = await this.validateItem(command.item);

    await this.writeRepository.updateItem(
      command.companyUserId.trim(),
      command.itemId.trim(),
      item
    );

    logger.info('Company preregistered item updated', {
      companyUserId: command.companyUserId,
      itemId: command.itemId,
      category: item.category,
    });
  }

  async removeItem(command: RemoveCompanyPreregisteredItemCommand): Promise<void> {
    this.validateCompanyUserId(command.companyUserId);
    this.validateObjectId(command.itemId, 'itemId');

    await this.writeRepository.removeItem(command.companyUserId.trim(), command.itemId.trim());

    logger.info('Company preregistered item removed', {
      companyUserId: command.companyUserId,
      itemId: command.itemId,
    });
  }

  private validateCompanyUserId(companyUserId: string): void {
    if (typeof companyUserId !== 'string' || companyUserId.trim() === '') {
      throw ErrorFactory.badRequest('companyUserId is required and cannot be empty or whitespace');
    }
  }

  private validateLocationKind(kind: CompanyPreregistrationLocationKind): void {
    if (kind !== 'origin' && kind !== 'destination') {
      throw ErrorFactory.badRequest('location kind is invalid');
    }
  }

  private validateCoordinates(value: unknown): Coordinates {
    if (!isValidCoordinates(value)) {
      throw ErrorFactory.badRequest('coordinates must be [lng, lat] within valid ranges');
    }

    return value;
  }

  private validateObjectId(value: string, fieldName: string): void {
    if (typeof value !== 'string' || value.trim() === '' || !Types.ObjectId.isValid(value.trim())) {
      throw ErrorFactory.badRequest(`${fieldName} must be a valid id`);
    }
  }

  private async validateItem(
    item: CompanyPreregisteredItemWriteDto
  ): Promise<CompanyPreregisteredItemWriteDto> {
    if (!item || typeof item !== 'object') {
      throw ErrorFactory.badRequest('item must be an object');
    }

    if (typeof item.description !== 'string' || item.description.trim() === '') {
      throw ErrorFactory.badRequest(
        'item description is required and cannot be empty or whitespace'
      );
    }

    if (typeof item.category !== 'string' || item.category.trim() === '') {
      throw ErrorFactory.badRequest('category is required and cannot be empty or whitespace');
    }

    if (item.value !== undefined && typeof item.value !== 'string') {
      throw ErrorFactory.badRequest('item value must be a string');
    }

    if (item.size !== undefined && !Object.values(ItemSizeDto).includes(item.size)) {
      throw ErrorFactory.badRequest('item size is invalid');
    }

    return {
      description: item.description.trim(),
      category: await this.toCanonicalMoveCategory(item.category),
      value: item.value?.trim(),
      size: item.size,
    };
  }

  private async toCanonicalMoveCategory(category: string): Promise<string> {
    const canonicalCategoryByName = await this.getCanonicalCategoryByName();
    const canonicalCategory = canonicalCategoryByName.get(this.normalizeCategory(category));

    if (!canonicalCategory) {
      throw ErrorFactory.badRequest('category is not a valid MOVE category');
    }

    return canonicalCategory;
  }

  private async getCanonicalCategoryByName(): Promise<Map<string, string>> {
    const categories = await this.categoryCatalogClient.getActiveCategories();

    if (categories.length === 0) {
      throw ErrorFactory.badRequest('no active MOVE categories are available');
    }

    const canonicalCategoryByName = new Map<string, string>();

    categories.forEach((category) => {
      this.addCategoryAlias(canonicalCategoryByName, category, category.nameEn);
      this.addCategoryAlias(canonicalCategoryByName, category, category.nameEs);
    });

    return canonicalCategoryByName;
  }

  private addCategoryAlias(
    canonicalCategoryByName: Map<string, string>,
    category: CategoryCatalogItem,
    alias: string
  ): void {
    canonicalCategoryByName.set(this.normalizeCategory(alias), category.nameEn);
  }

  private normalizeCategory(category: string): string {
    return category.trim().toLowerCase();
  }

  private toLocationType(
    kind: CompanyPreregistrationLocationKind
  ): CompanyPreregistrationLocationType {
    return kind === 'origin' ? 'origins' : 'destinations';
  }
}
