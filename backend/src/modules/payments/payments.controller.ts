import { Controller, Get, Post, Body, Param, Patch, UseGuards, Req, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { DeclarePaymentDto, DirectPaymentDto, ValidatePaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('contributions/:contributionId/declare')
  declarePayment(
    @Param('contributionId') contributionId: string,
    @Req() req: AuthenticatedRequest,
    @Body() declarePaymentDto: DeclarePaymentDto,
  ) {
    return this.paymentsService.declarePayment(contributionId, req.user.userId, declarePaymentDto);
  }

  @Post('contributions/:contributionId/direct')
  directPayment(
    @Param('contributionId') contributionId: string,
    @Req() req: AuthenticatedRequest,
    @Body() directPaymentDto: DirectPaymentDto,
  ) {
    return this.paymentsService.directPayment(contributionId, req.user.userId, directPaymentDto);
  }

  @Patch(':paymentId/validate')
  validatePayment(
    @Param('paymentId') paymentId: string,
    @Req() req: AuthenticatedRequest,
    @Body() validatePaymentDto: ValidatePaymentDto,
  ) {
    return this.paymentsService.validatePayment(paymentId, req.user.userId, validatePaymentDto);
  }

  @Get('contributions/:contributionId/pending')
  getPendingPayments(@Param('contributionId') contributionId: string, @Req() req: AuthenticatedRequest) {
    return this.paymentsService.getPendingPayments(contributionId, req.user.userId);
  }

  @Get('contributions/:contributionId/user/:userId')
  getUserPayments(
    @Param('contributionId') contributionId: string,
    @Param('userId') userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.getUserPayments(contributionId, userId, req.user.userId);
  }

  @Get('notifications/manager-pending')
  listManagerPendingNotifications(@Req() req: AuthenticatedRequest) {
    return this.paymentsService.listManagerPendingNotifications(req.user.userId);
  }

  @Get('notifications/my-updates')
  listMyPaymentUpdates(@Req() req: AuthenticatedRequest, @Query('since') since?: string) {
    return this.paymentsService.listMyPaymentUpdates(req.user.userId, since);
  }
}
