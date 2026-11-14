import { DonationsModule } from '../donations/donations.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign, CampaignSchema, CampaignFollow, CampaignFollowSchema } from './schemas/campaign.schema';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
@Module({
  imports: [DonationsModule, MongooseModule.forFeature([{ name: Campaign.name, schema: CampaignSchema }, { name: CampaignFollow.name, schema: CampaignFollowSchema }])],
  controllers: [CampaignsController], providers: [CampaignsService],
})
export class CampaignsModule {}
