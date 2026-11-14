import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CampaignBudgetDto {
  @IsString() @MinLength(2) @MaxLength(100) label: string;
  @IsInt() @Min(1) @Max(100_000_000) amountMinor: number;
}
export class CreateCampaignDto {
  @IsString() @MinLength(5) @MaxLength(100) title: string;
  @IsString() @MinLength(15) @MaxLength(240) summary: string;
  @IsString() @MinLength(30) @MaxLength(5000) description: string;
  @IsIn(['materials', 'scholarship', 'technology']) category: string;
  @IsInt() @Min(100) @Max(100_000_000) goalMinor: number;
  @IsInt() @Min(1) @Max(10000) beneficiaryCount: number;
  @IsString() @MinLength(10) @MaxLength(500) learningGoal: string;
  @IsString() @MinLength(10) @MaxLength(1000) selectionCriteria: string;
  @IsString() @MinLength(10) @MaxLength(1000) insufficientFundsPolicy: string;
  @IsString() @MinLength(10) @MaxLength(1000) surplusPolicy: string;
  @IsDateString() deadline: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => CampaignBudgetDto)
  budget: CampaignBudgetDto[];
}
