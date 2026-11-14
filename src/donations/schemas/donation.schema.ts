import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongoSchema, Types } from 'mongoose';
export type DonationDocument = HydratedDocument<Donation>;
@Schema({ timestamps: true })
export class Donation {
  @Prop({type:MongoSchema.Types.ObjectId,ref:'User',required:true,index:true}) userId: Types.ObjectId;
  @Prop({type:MongoSchema.Types.ObjectId,ref:'Campaign',required:true,index:true}) campaignId: Types.ObjectId;
  @Prop({required:true}) campaignTitle: string;
  @Prop({required:true}) idempotencyKey: string;
  @Prop({required:true,min:1}) amountMinor: number;
  @Prop({default:'MXN'}) currency: string;
  @Prop({required:true,enum:['creating','pending','failed','review']}) status: string;
  @Prop({required:true}) expiresAt: Date;
  @Prop() providerQrId?: string;
  @Prop({select:false}) qrString?: string;
  @Prop({select:false}) qrImage?: string;
}
export const DonationSchema = SchemaFactory.createForClass(Donation);
DonationSchema.index({userId:1,idempotencyKey:1},{unique:true});
DonationSchema.index({providerQrId:1},{unique:true,sparse:true});

export type PaymentReceiptDocument = HydratedDocument<PaymentReceipt>;
@Schema({ timestamps:true })
export class PaymentReceipt {
  @Prop({required:true,unique:true}) transactionId: string;
  @Prop({type:MongoSchema.Types.ObjectId,ref:'Donation',required:true,index:true}) donationId: Types.ObjectId;
  @Prop({type:MongoSchema.Types.ObjectId,ref:'Campaign',required:true,index:true}) campaignId: Types.ObjectId;
  @Prop({type:MongoSchema.Types.ObjectId,ref:'User',required:true,index:true}) userId: Types.ObjectId;
  @Prop({required:true}) amountMinor: number;
  @Prop({required:true,enum:['confirmed','review']}) status: string;
  @Prop() reviewReason?: string;
  @Prop() webhookId?: string;
  @Prop({required:true}) paidAt: Date;
}
export const PaymentReceiptSchema = SchemaFactory.createForClass(PaymentReceipt);
