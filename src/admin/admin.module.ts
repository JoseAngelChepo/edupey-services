import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign, CampaignSchema } from '../campaigns/schemas/campaign.schema';
import { DonationsModule } from '../donations/donations.module';
import { Donation, DonationSchema, PaymentReceipt, PaymentReceiptSchema } from '../donations/schemas/donation.schema';
import { UsersModule } from '../users/users.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    DonationsModule,
    UsersModule,
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationSchema },
      { name: PaymentReceipt.name, schema: PaymentReceiptSchema },
      { name: Campaign.name, schema: CampaignSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
