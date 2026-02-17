import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

export class UpdateMemberRoleDto {
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}

export class CreateGroupInvitationDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

export class AcceptGroupInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
