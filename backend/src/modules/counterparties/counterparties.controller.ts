import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CounterpartyType } from '@prisma/client';
import { ADMIN_MANAGER, READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CounterpartiesService } from './counterparties.service';
import { CreateCounterpartyDto, UpdateCounterpartyDto } from './dto/counterparty.dto';
import { CreateContractMetaDto, UpdateContractMetaDto } from './dto/contracts.dto';

@Controller()
export class CounterpartiesController {
  constructor(private readonly svc: CounterpartiesService) {}

  @Roles(...ADMIN_MANAGER)
  @Get('counterparties')
  list(
    @Query('type') type: CounterpartyType,
    @Query('q') q?: string,
  ) {
    return this.svc.list(type, q);
  }

  @Roles(...ADMIN_MANAGER)
  @Post('counterparties')
  create(@Body() dto: CreateCounterpartyDto) {
    return this.svc.create(dto);
  }

  @Roles(...ADMIN_MANAGER)
  @Patch('counterparties/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCounterpartyDto) {
    return this.svc.update(id, dto);
  }

  @Roles(...ADMIN_MANAGER)
  @Delete('counterparties/:id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Roles(...ADMIN_MANAGER)
  @Get('counterparties/:id/contracts')
  listContracts(@Param('id') id: string, @Query('q') q?: string) {
    return this.svc.listContracts(id, q);
  }

  @Roles(...ADMIN_MANAGER)
  @Post('counterparties/:id/contracts')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024, files: 1 },
    }),
  )
  uploadContract(
    @Param('id') counterpartyId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() meta: CreateContractMetaDto,
    @Body('originalName') originalName: string | undefined,
    @CurrentUser() user: JwtUser,
  ) {
    return this.svc.uploadContract(counterpartyId, file, meta, user.email, originalName);
  }

  @Roles(...ADMIN_MANAGER)
  @Get('contracts/search')
  searchContracts(@Query('number') number: string) {
    return this.svc.searchContractsByNumber(number);
  }

  @Roles(...READ_ROLES)
  @Get('contracts/:id/file')
  async downloadContract(@Param('id') id: string) {
    const { stream } = await this.svc.getContractFile(id);
    return stream;
  }

  @Roles(...ADMIN_MANAGER)
  @Get('contracts/:id/procurement-items')
  procurementItems(@Param('id') id: string, @Query('force') force?: string) {
    return this.svc.getContractProcurementItems(id, { force: force === '1' || force === 'true' });
  }

  @Roles(...ADMIN_MANAGER)
  @Patch('contracts/:id')
  updateContractMeta(@Param('id') id: string, @Body() dto: UpdateContractMetaDto) {
    return this.svc.updateContractMeta(id, dto);
  }

  @Roles(...ADMIN_MANAGER)
  @Delete('contracts/:id')
  removeContract(@Param('id') id: string) {
    return this.svc.removeContract(id);
  }
}

