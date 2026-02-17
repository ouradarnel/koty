import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Frequency, MemberStartMode } from '@prisma/client';

export enum ContributionInviteScope {
  ALL = 'ALL',
  SELECTED = 'SELECTED',
}

export class CreateContributionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string; // EUR, XOF, USD, etc.

  @IsEnum(Frequency)
  frequency: Frequency;

  @ValidateIf((dto: CreateContributionDto) => dto.frequency !== Frequency.DELAY)
  @IsNumber()
  @Min(1)
  @Max(31)
  dueDay?: number; // Day of the month (1-31)

  @ValidateIf((dto: CreateContributionDto) => dto.frequency === Frequency.DELAY)
  @IsDateString()
  deadlineDate?: string;

  @ValidateIf((dto: CreateContributionDto) => dto.frequency !== Frequency.DELAY)
  @IsDateString()
  @IsOptional()
  firstPeriodDate?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  durationPeriods?: number;

  @IsEnum(ContributionInviteScope)
  @IsOptional()
  inviteScope?: ContributionInviteScope;

  @ValidateIf(
    (dto: CreateContributionDto) => (dto.inviteScope ?? ContributionInviteScope.ALL) === ContributionInviteScope.SELECTED,
  )
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  invitedUserIds?: string[];

  @IsEnum(MemberStartMode)
  @IsOptional()
  invitationStartMode?: MemberStartMode;
}

export class UpdateContributionDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsNumber()
  @Min(1)
  @Max(31)
  @IsOptional()
  dueDay?: number;
}

export class AddContributionMemberDto {
  @IsUUID('4')
  userId: string;

  @IsEnum(MemberStartMode)
  @IsOptional()
  startMode?: MemberStartMode;
}

export class CreateContributionInvitationDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  userIds: string[];

  @IsEnum(MemberStartMode)
  @IsOptional()
  startMode?: MemberStartMode;
}

export class AcceptContributionInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
