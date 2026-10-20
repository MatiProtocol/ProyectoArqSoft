import { ErrorFactory } from '@move/errors-lib';
import { MongoServerError } from 'mongodb';
import type { User } from '../../domain/entities/user';
import type { UserRole } from '../../domain/enums/user-role';
import type { IUserWriteRepository } from '../../domain/repositories/user.write.repository';
import { UserModel } from '../models/user.model';

export class UserWriteRepository implements IUserWriteRepository {
  async create(user: User): Promise<void> {
    const userDocument = new UserModel({
      _id: user.id,
      email: user.email,
      roles: user.roles,
      name: user.name,
      phone: user.phone,
      city: user.city,
    });

    try {
      await userDocument.save();
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000 && error.keyPattern) {
        if (error.keyPattern?.email) {
          throw ErrorFactory.badRequest('Email already exists, please try to log in.');
        } else {
          throw ErrorFactory.badRequest('This client ID is already registered.');
        }
      }
      throw error;
    }
  }

  async updateRoles(id: string, roles: UserRole[]): Promise<void> {
    const result = await UserModel.updateOne({ _id: id }, { $set: { roles: roles } });
    if (result.matchedCount === 0) {
      throw ErrorFactory.notFound('User');
    }
  }
}
