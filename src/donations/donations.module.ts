import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign,CampaignSchema } from '../campaigns/schemas/campaign.schema';
import { Donation,DonationSchema,PaymentReceipt,PaymentReceiptSchema } from './schemas/donation.schema';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { PeyService } from './pey.service';
@Module({
  imports:[MongooseModule.forFeature([{name:Donation.name,schema:DonationSchema},{name:PaymentReceipt.name,schema:PaymentReceiptSchema},{name:Campaign.name,schema:CampaignSchema}])],
  providers:[PeyService,DonationsService],controllers:[DonationsController],exports:[PeyService,MongooseModule],
})
export class DonationsModule {}
