import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ShipmentStatus } from '@prisma/client';
import { ADMIN_MANAGER, MUTATE_ROLES, READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipmentWarehouseCommentDto } from './dto/shipment-warehouse-comment.dto';
import { ShipmentWarehouseResumeDto } from './dto/shipment-warehouse-resume.dto';
import { CompleteShipmentPickingDto } from './dto/complete-shipment-picking.dto';
import { ShipmentsService } from './shipments.service';

@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly svc: ShipmentsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query('status') status?: ShipmentStatus) {
    return this.svc.list(status);
  }

  @Roles(...READ_ROLES)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Roles(...ADMIN_MANAGER)
  @Post()
  create(@Body() dto: CreateShipmentDto, @CurrentUser() user: JwtUser) {
    return this.svc.create(dto, user.email, user.userId);
  }

  @Roles(...ADMIN_MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: CreateShipmentDto, @CurrentUser() user: JwtUser) {
    return this.svc.update(id, dto, user.email, user.userId);
  }

  @Roles(...ADMIN_MANAGER)
  @Patch(':id/send-to-picking')
  sendToPicking(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.svc.sendToPicking(id, user.email);
  }

  @Roles(...ADMIN_MANAGER)
  @Patch(':id/pause-picking')
  pausePicking(@Param('id') id: string, @Body() dto: ShipmentWarehouseCommentDto, @CurrentUser() user: JwtUser) {
    return this.svc.pausePicking(id, dto.comment, user.email);
  }

  @Roles(...ADMIN_MANAGER)
  @Patch(':id/resume-picking')
  resumePicking(@Param('id') id: string, @Body() dto: ShipmentWarehouseResumeDto, @CurrentUser() user: JwtUser) {
    return this.svc.resumePicking(id, dto.comment, user.email);
  }

  @Roles(...ADMIN_MANAGER)
  @Patch(':id/recall-from-picking')
  recallFromPicking(@Param('id') id: string, @Body() dto: ShipmentWarehouseCommentDto, @CurrentUser() user: JwtUser) {
    return this.svc.recallFromPicking(id, dto.comment, user.email);
  }

  @Roles(...MUTATE_ROLES)
  @Patch(':id/complete-picking')
  completePicking(
    @Param('id') id: string,
    @Body() dto: CompleteShipmentPickingDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.completePicking(id, dto, user.email);
  }

  @Roles(...READ_ROLES)
  @Get(':id/print-data')
  printData(@Param('id') id: string) {
    return this.svc.printData(id);
  }

  @Roles(...MUTATE_ROLES)
  @Get(':id/writeoff-cart-seed')
  writeoffCartSeed(@Param('id') id: string) {
    return this.svc.writeoffCartSeed(id);
  }

  @Roles(...ADMIN_MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

