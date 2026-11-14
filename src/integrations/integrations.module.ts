import { DonationsModule } from '../donations/donations.module';
import { Module } from '@nestjs/common';
import { EmailsModule } from '../emails/emails.module';
import { GoogleOAuthIntegration } from './google-oauth.integration';
import { IntegrationsService } from './integrations.service';

@Module({
  imports: [EmailsModule, DonationsModule],
  providers: [GoogleOAuthIntegration, IntegrationsService],
  exports: [GoogleOAuthIntegration, IntegrationsService],
})
export class IntegrationsModule {}
