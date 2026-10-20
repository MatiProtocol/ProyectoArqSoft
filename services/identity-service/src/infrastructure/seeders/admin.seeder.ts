import { UserRole } from '../../domain/enums/user-role';
import { UserModel } from '../models/user.model';

export async function seedAdminUser() {
  const adminId = process.env.ADMIN_ID;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName = process.env.ADMIN_NAME || 'Admin';
  const adminPhone = process.env.ADMIN_PHONE || '000000000';
  const adminCity = process.env.ADMIN_CITY || 'Default City';

  if (!adminId || !adminEmail) {
    console.warn('Admin seed skipped: ADMIN_ID or ADMIN_EMAIL not set.');
    return;
  }

  const existing = await UserModel.findOne({ email: adminEmail }).lean();
  if (existing) {
    console.log(`Admin user with email ${adminEmail} already exists.`);
    return;
  }

  try {
    await UserModel.create({
      _id: adminId,
      email: adminEmail,
      roles: [UserRole.ADMIN],
      name: adminName,
      phone: adminPhone,
      city: adminCity,
    });
    console.log(`Admin user created with email ${adminEmail}`);
  } catch (error) {
    console.error('Failed to seed admin user:', error);
  }
}
