import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { UsersService } from './users.service';
import { AdminResetPasswordDto, CreatePasswordResetRequestDto } from './dto/admin-users.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('password-reset-requests')
  async createPasswordResetRequest(@Body() dto: CreatePasswordResetRequestDto) {
    await this.usersService.createPasswordResetRequestByEmail(dto.email, dto.note);
    return {
      message: 'Si un compte existe avec cet email, la demande a été transmise aux administrateurs.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/accounts')
  async listAccounts(@Req() req: AuthenticatedRequest) {
    if (!req.user.isAdmin) {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    return this.usersService.listForAdmin();
  }

  @UseGuards(JwtAuthGuard)
  @Get('admin/password-reset-requests')
  async listPasswordResetRequests(@Req() req: AuthenticatedRequest) {
    if (!req.user.isAdmin) {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    return this.usersService.listPendingPasswordResetRequests();
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/password-reset-requests/:requestId/reject')
  async rejectPasswordResetRequest(@Req() req: AuthenticatedRequest, @Param('requestId') requestId: string) {
    if (!req.user.isAdmin) {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    const rejected = await this.usersService.rejectPasswordResetRequest(requestId, req.user.userId);
    if (!rejected) {
      throw new NotFoundException('Demande introuvable ou déjà traitée');
    }

    return { message: 'Demande refusée.' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('admin/reset-password')
  async adminResetPassword(@Req() req: AuthenticatedRequest, @Body() dto: AdminResetPasswordDto) {
    if (!req.user.isAdmin) {
      throw new ForbiddenException('Accès réservé aux administrateurs');
    }

    const targetUser = await this.usersService.findById(dto.userId);
    if (!targetUser) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.adminResetPassword(dto.userId, passwordHash);
    await this.usersService.resolvePasswordResetRequestAfterReset(dto.userId, req.user.userId, dto.requestId);

    return {
      message: `Mot de passe réinitialisé pour ${targetUser.email}`,
    };
  }
}
