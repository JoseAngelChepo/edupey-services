import { Body, Controller, Get, Param, Post, Req, UseGuards, RawBodyRequest, HttpCode } from '@nestjs/common';
import { Request } from 'express';
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
import { CreateDonationDto } from './dto/create-donation.dto';
import { DonationsService } from './donations.service';
@Controller()
export class DonationsController {
  constructor(private readonly service:DonationsService) {}
  @Post('campaigns/:id/donations') @UseGuards(JwtAuthGuard,RolesGuard,CsrfGuard) @Roles(UserRole.USER)
  @RateLimit({limit:10,windowMs:60*1000})
  create(@Param('id',ParseObjectIdPipe) id:Types.ObjectId,@CurrentUser() user:JwtPayload,@Body() dto:CreateDonationDto) { return this.service.create(id,user.sub,dto); }
  @Get('donations/mine') @UseGuards(JwtAuthGuard,RolesGuard) @Roles(UserRole.USER)
  history(@CurrentUser() user:JwtPayload) { return this.service.history(user.sub); }
  @Get('donations/:id') @UseGuards(JwtAuthGuard,RolesGuard) @Roles(UserRole.USER)
  detail(@Param('id',ParseObjectIdPipe) id:Types.ObjectId,@CurrentUser() user:JwtPayload) { return this.service.detail(id,user.sub); }
  @Post('donations/:id/reconcile') @HttpCode(200) @UseGuards(JwtAuthGuard,RolesGuard,CsrfGuard) @Roles(UserRole.USER)
  @RateLimit({limit:6,windowMs:60*1000})
  reconcile(@Param('id',ParseObjectIdPipe) id:Types.ObjectId,@CurrentUser() user:JwtPayload) { return this.service.reconcile(id,user.sub); }
  @Post('webhooks/pey') @HttpCode(200)
  webhook(@Req() request:RawBodyRequest<Request>) { return this.service.webhook(request.rawBody,request.headers); }
}
