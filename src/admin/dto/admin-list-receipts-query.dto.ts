import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class AdminListReceiptsQueryDto {
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
  @IsIn(['confirmed', 'review'])
  status?: 'confirmed' | 'review';

  @IsOptional()
  @IsMongoId()
  campaignId?: string;

  @IsOptional()
  @IsMongoId()
  donationId?: string;
}
