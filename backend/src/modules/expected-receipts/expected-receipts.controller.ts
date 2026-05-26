import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MUTATE_ROLES, READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { CreateExpectedReceiptDto } from './dto/create-expected-receipt.dto';
import { ExpectedReceiptActionCommentDto } from './dto/expected-receipt-action-comment.dto';
import { ExpectedReceiptsQueryDto } from './dto/expected-receipts-query.dto';
import { UpdateExpectedReceiptDto } from './dto/update-expected-receipt.dto';
import { ExpectedReceiptsService } from './expected-receipts.service';

@Controller('expected-receipts')
export class ExpectedReceiptsController {
  constructor(private readonly expectedReceipts: ExpectedReceiptsService) {}

  @Roles(...READ_ROLES)
  @Get()
  list(@Query() query: ExpectedReceiptsQueryDto) {
    return this.expectedReceipts.list(query);
  }

  @Roles(...READ_ROLES)
  @Get('active')
  listActive(@Query('productId') productId: string) {
    return this.expectedReceipts.listActiveForProduct(productId);
  }

  @Roles(...MUTATE_ROLES)
  @Post()
  create(@Body() dto: CreateExpectedReceiptDto, @CurrentUser() actor: JwtUser) {
    return this.expectedReceipts.create(dto, actor.email, actor.userId);
  }

  @Roles(...MUTATE_ROLES)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateExpectedReceiptDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.expectedReceipts.update(id, dto, actor.email, actor.userId);
  }

  @Roles(...MUTATE_ROLES)
  @Post(':id/close')
  close(
    @Param('id') id: string,
    @Body() dto: ExpectedReceiptActionCommentDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.expectedReceipts.close(id, dto.comment, actor.email, actor.userId);
  }

  @Roles(...MUTATE_ROLES)
  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: ExpectedReceiptActionCommentDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.expectedReceipts.cancel(id, dto.comment, actor.email, actor.userId);
  }

  @Roles(...MUTATE_ROLES)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: JwtUser) {
    return this.expectedReceipts.remove(id, actor.userId);
  }
}
