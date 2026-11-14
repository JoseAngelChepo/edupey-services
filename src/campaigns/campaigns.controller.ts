import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RateLimit } from '../common/decorators/rate-limit.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { UserRole } from '../users/schemas/user.schema';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}
  @Get() list() { return this.service.list(); }

  @Get('following') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.USER)
  following(@CurrentUser() user: JwtPayload) { return this.service.dashboard(user.sub); }

  @Get(':id')
  detail(@Param('id', ParseObjectIdPipe) id: Types.ObjectId) { return this.service.detail(id); }

  @Post() @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard) @Roles(UserRole.ADMIN)
  @RateLimit({ limit: 20, windowMs: 60 * 60 * 1000 })
  create(@Body() dto: CreateCampaignDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Post(':id/follow') @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard) @Roles(UserRole.USER)
  @RateLimit({ limit: 60, windowMs: 60 * 1000 })
  follow(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @CurrentUser() user: JwtPayload) {
    return this.service.follow(id, user.sub);
  }

  @Delete(':id/follow') @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard) @Roles(UserRole.USER)
  unfollow(@Param('id', ParseObjectIdPipe) id: Types.ObjectId, @CurrentUser() user: JwtPayload) {
    return this.service.unfollow(id, user.sub);
  }
}
