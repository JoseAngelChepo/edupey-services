import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const ADMIN_DONATION_STATUSES = [
  'creating',
  'pending',
  'confirmed',
  'expired',
  'failed',
  'review',
] as const;

export class AdminListDonationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsIn(ADMIN_DONATION_STATUSES)
  status?: (typeof ADMIN_DONATION_STATUSES)[number];

  @IsOptional()
  @IsMongoId()
  campaignId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}
