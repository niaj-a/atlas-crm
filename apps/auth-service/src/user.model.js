import mongoose from 'mongoose';
import { USER_ROLES } from '@crm/shared';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: 'sales' },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', userSchema);
