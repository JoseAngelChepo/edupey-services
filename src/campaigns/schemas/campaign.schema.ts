import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongoSchema, Types } from 'mongoose';

export type CampaignDocument = HydratedDocument<Campaign>;
@Schema({ timestamps: true })
export class Campaign {
  @Prop({ required: true, trim: true }) title: string;
  @Prop({ required: true, trim: true }) summary: string;
  @Prop({ required: true }) description: string;
  @Prop({ required: true, enum: ['materials', 'scholarship', 'technology'] }) category: string;
  @Prop({ required: true, min: 100 }) goalMinor: number;
  @Prop({ default: 'MXN', enum: ['MXN'] }) currency: string;
  @Prop({ required: true, min: 1 }) beneficiaryCount: number;
  @Prop({ required: true }) learningGoal: string;
  @Prop({ required: true }) selectionCriteria: string;
  @Prop({ required: true }) insufficientFundsPolicy: string;
  @Prop({ required: true }) surplusPolicy: string;
  @Prop({ required: true }) deadline: Date;
  @Prop({ type: [{ label: String, amountMinor: Number, _id: false }], required: true })
  budget: { label: string; amountMinor: number }[];
  @Prop({ default: false }) isDemo: boolean;
  @Prop({ type: MongoSchema.Types.ObjectId, ref: 'User' }) createdBy?: Types.ObjectId;
}
export const CampaignSchema = SchemaFactory.createForClass(Campaign);
CampaignSchema.index({ createdAt: -1 });

@Schema({ timestamps: true })
export class CampaignFollow {
  @Prop({ type: MongoSchema.Types.ObjectId, ref: 'User', required: true }) userId: Types.ObjectId;
  @Prop({ type: MongoSchema.Types.ObjectId, ref: 'Campaign', required: true }) campaignId: Types.ObjectId;
}
export const CampaignFollowSchema = SchemaFactory.createForClass(CampaignFollow);
CampaignFollowSchema.index({ userId: 1, campaignId: 1 }, { unique: true });
