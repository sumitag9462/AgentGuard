import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema({
  name: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
