import { Controller, Get, Param, Post, Query, UseGuards, HttpCode } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { UserRole } from '../users/schemas/user.schema';
import { AdminService } from './admin.service';
import { AdminListDonationsQueryDto } from './dto/admin-list-donations-query.dto';
import { AdminListReceiptsQueryDto } from './dto/admin-list-receipts-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Get('donations')
  listDonations(@Query() query: AdminListDonationsQueryDto) {
    return this.admin.listDonations(query);
  }

  @Get('donations/:id')
  donation(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.admin.donation(id);
  }

  @Post('donations/:id/reconcile')
  @HttpCode(200)
  @RateLimit({ limit: 12, windowMs: 60 * 1000 })
  @UseGuards(CsrfGuard)
  reconcile(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) {
    return this.admin.reconcileDonation(id);
  }

  @Get('receipts')
  listReceipts(@Query() query: AdminListReceiptsQueryDto) {
    return this.admin.listReceipts(query);
  }
}
