import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserRole } from '../../../src/domain/enums/user-role';
import { UserModel } from '../../../src/infrastructure/models/user.model';
import { seedAdminUser } from '../../../src/infrastructure/seeders/admin.seeder';

describe('Admin Seeder Integration', () => {
  let mongoServer: MongoMemoryServer | undefined;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    delete process.env.ADMIN_ID;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_NAME;
    delete process.env.ADMIN_PHONE;
    delete process.env.ADMIN_CITY;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create the admin when it does not exist and env vars are set', async () => {
    process.env.ADMIN_ID = 'auth0|123';
    process.env.ADMIN_EMAIL = 'admin@test.com';
    process.env.ADMIN_NAME = 'Super Admin';

    await seedAdminUser();

    const created = await UserModel.findOne({ email: 'admin@test.com' }).lean();
    expect(created).not.toBeNull();
    expect(created?._id).toBe('auth0|123');
    expect(created?.roles).toContain(UserRole.ADMIN);
    expect(created?.name).toBe('Super Admin');
  });

  it('should not create a duplicate admin if one already exists with the same email', async () => {
    process.env.ADMIN_ID = 'auth0|123';
    process.env.ADMIN_EMAIL = 'admin@test.com';

    await UserModel.create({
      _id: 'auth0|existing',
      email: 'admin@test.com',
      roles: [UserRole.ADMIN],
      name: 'Old Admin',
      phone: '111111111',
      city: 'Old City',
    });

    await seedAdminUser();

    const users = await UserModel.find({ email: 'admin@test.com' }).lean();
    expect(users).toHaveLength(1);
    expect(users[0]._id).toBe('auth0|existing');
  });

  it('should do nothing if ADMIN_ID or ADMIN_EMAIL is missing', async () => {
    process.env.ADMIN_ID = 'auth0|123';

    await seedAdminUser();

    const count = await UserModel.countDocuments();
    expect(count).toBe(0);
  });

  it('should use default values for name, phone, city if not provided', async () => {
    process.env.ADMIN_ID = 'auth0|123';
    process.env.ADMIN_EMAIL = 'admin@test.com';

    await seedAdminUser();

    const created = await UserModel.findOne({ email: 'admin@test.com' }).lean();
    expect(created?.name).toBe('Admin');
    expect(created?.phone).toBe('000000000');
    expect(created?.city).toBe('Default City');
  });

  it('should log an error if UserModel.create fails', async () => {
    process.env.ADMIN_ID = 'auth0|123';
    process.env.ADMIN_EMAIL = 'admin@test.com';

    const createSpy = jest
      .spyOn(UserModel, 'create')
      .mockRejectedValueOnce(new Error('Simulated database error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await seedAdminUser();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to seed admin user:', expect.any(Error));

    createSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
