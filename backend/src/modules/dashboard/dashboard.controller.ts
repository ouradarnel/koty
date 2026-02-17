import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('groups/:groupId/member')
  getMemberDashboard(@Param('groupId') groupId: string, @Req() req: AuthenticatedRequest) {
    return this.dashboardService.getMemberDashboard(groupId, req.user.userId);
  }

  @Get('groups/:groupId/manager')
  getManagerDashboard(@Param('groupId') groupId: string, @Req() req: AuthenticatedRequest) {
    return this.dashboardService.getManagerDashboard(groupId, req.user.userId);
  }
}
