import { model, Schema } from 'mongoose';
import { UserRole } from '../../domain/enums/user-role';

export interface UserDocument extends Document {
  _id: string;
  email: string;
  roles: UserRole[];
  name: string;
  phone: string;
  city: string;
}

const userSchema = new Schema<UserDocument>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    roles: { type: [String], enum: Object.values(UserRole), default: [UserRole.CLIENT_INDIVIDUAL] },
    phone: { type: String, required: true },
    city: { type: String, required: true },
  },
  { versionKey: false }
);

export const UserModel = model<UserDocument>('User', userSchema);
