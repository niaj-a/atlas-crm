import mongoose from 'mongoose';
import { ACTIVITY_TYPES, CUSTOMER_STATUSES, MAX_CUSTOMER_ACTIVITIES } from '@crm/shared';

const activitySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ACTIVITY_TYPES, default: 'note' },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

const customerSchema = new mongoose.Schema(
  {
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true },
    company: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 40 },
    status: { type: String, enum: CUSTOMER_STATUSES, default: 'lead' },
    activities: {
      type: [activitySchema],
      validate: {
        validator(value) {
          return !value || value.length <= MAX_CUSTOMER_ACTIVITIES;
        },
        message: `A customer can have at most ${MAX_CUSTOMER_ACTIVITIES} activities`,
      },
    },
  },
  { timestamps: true },
);

customerSchema.index({ ownerId: 1, name: 1 });
export const Customer = mongoose.model('Customer', customerSchema);
