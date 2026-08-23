import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  organizationId: mongoose.Types.ObjectId;
  role: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  role: { type: String, enum: ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'], default: 'VIEWER' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const User = mongoose.model<IUser>('User', UserSchema);
