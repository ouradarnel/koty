import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req, Query } from '@nestjs/common';
import { GroupsService } from './groups.service';
import {
  CreateGroupDto,
  AddMemberDto,
  UpdateMemberRoleDto,
  CreateGroupInvitationDto,
  AcceptGroupInvitationDto,
} from './dto/group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() createGroupDto: CreateGroupDto) {
    return this.groupsService.create(req.user.userId, createGroupDto);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest, @Query('createdByMe') createdByMe?: string) {
    return this.groupsService.findAll(req.user.userId, { createdByMe: createdByMe === 'true' });
  }

  @Post(':id/invitations')
  createInvitation(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() dto: CreateGroupInvitationDto) {
    return this.groupsService.createInvitation(id, req.user.userId, dto);
  }

  @Get(':id/invitations')
  listPendingInvitations(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.groupsService.listPendingInvitations(id, req.user.userId);
  }

  @Get('invitations/me')
  listMyPendingInvitations(@Req() req: AuthenticatedRequest) {
    return this.groupsService.listMyPendingInvitations(req.user.userId);
  }

  @Post('invitations/accept')
  acceptInvitation(@Req() req: AuthenticatedRequest, @Body() dto: AcceptGroupInvitationDto) {
    return this.groupsService.acceptInvitation(req.user.userId, dto);
  }

  @Post('invitations/:invitationId/decline')
  declineInvitation(@Param('invitationId') invitationId: string, @Req() req: AuthenticatedRequest) {
    return this.groupsService.declineInvitation(invitationId, req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.groupsService.findOne(id, req.user.userId);
  }

  @Post(':id/members')
  addMember(@Param('id') id: string, @Req() req: AuthenticatedRequest, @Body() addMemberDto: AddMemberDto) {
    return this.groupsService.addMember(id, req.user.userId, addMemberDto);
  }

  @Patch(':groupId/members/:memberId')
  updateMemberRole(
    @Param('groupId') groupId: string,
    @Param('memberId') memberId: string,
    @Req() req: AuthenticatedRequest,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ) {
    return this.groupsService.updateMemberRole(groupId, memberId, req.user.userId, updateMemberRoleDto);
  }
}
