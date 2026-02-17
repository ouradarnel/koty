import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { GroupsModule } from '../groups/groups.module';
import { ContributionsModule } from '../contributions/contributions.module';

@Module({
  imports: [GroupsModule, ContributionsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
