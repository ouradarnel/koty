import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, IsBoolean } from 'class-validator';

export class DeclarePaymentDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  proofUrl?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class DirectPaymentDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsOptional()
  note?: string;
}

export class ValidatePaymentDto {
  @IsBoolean()
  @IsNotEmpty()
  approve: boolean; // true = approve, false = reject
}
