import { IsInt, IsUUID, Max, Min } from 'class-validator';
export class CreateDonationDto {
  @IsInt() @Min(1) @Max(100_000_000) amountMinor: number;
  @IsUUID('4') idempotencyKey: string;
}
