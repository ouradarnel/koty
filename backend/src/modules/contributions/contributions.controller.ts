import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req } from '@nestjs/common';
import { ContributionsService } from './contributions.service';
import {
  AcceptContributionInvitationDto,
  AddContributionMemberDto,
  CreateContributionDto,
  CreateContributionInvitationDto,
  UpdateContributionDto,
} from './dto/contribution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('contributions')
@UseGuards(JwtAuthGuard)
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Post('groups/:groupId')
  create(
    @Param('groupId') groupId: string,
    @Req() req: AuthenticatedRequest,
    @Body() createContributionDto: CreateContributionDto,
  ) {
    return this.contributionsService.create(groupId, req.user.userId, createContributionDto);
  }

  @Get('groups/:groupId')
  findAll(@Param('groupId') groupId: string, @Req() req: AuthenticatedRequest) {
    return this.contributionsService.findAll(groupId, req.user.userId);
  }

  @Get('invitations/me')
  listMyPendingInvitations(@Req() req: AuthenticatedRequest) {
    return this.contributionsService.listMyPendingInvitations(req.user.userId);
  }

  @Post('invitations/accept')
  acceptInvitation(@Req() req: AuthenticatedRequest, @Body() dto: AcceptContributionInvitationDto) {
    return this.contributionsService.acceptInvitation(req.user.userId, dto);
  }

  @Post('invitations/:invitationId/decline')
  declineInvitation(@Param('invitationId') invitationId: string, @Req() req: AuthenticatedRequest) {
    return this.contributionsService.declineInvitation(invitationId, req.user.userId);
  }

  @Post(':id/invitations')
  createInvitations(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateContributionInvitationDto,
  ) {
    return this.contributionsService.createInvitations(id, req.user.userId, dto);
  }

  @Get(':id/invitations')
  listPendingInvitations(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.contributionsService.listPendingInvitations(id, req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.contributionsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() updateContributionDto: UpdateContributionDto) {
    return this.contributionsService.update(id, req.user.userId, updateContributionDto);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() addMemberDto: AddContributionMemberDto) {
    return this.contributionsService.addMember(id, req.user.userId, addMemberDto);
  }

  @Get(':id/balance/:userId')
  getBalance(@Param('id') id: string, @Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    return this.contributionsService.calculateBalance(id, userId, req.user.userId);
  }
}
