import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePasswordResetRequestDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class AdminResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;

  @IsString()
  @IsOptional()
  requestId?: string;
}
