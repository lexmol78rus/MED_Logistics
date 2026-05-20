import { Controller, Get, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { BarcodeService } from './barcode.service';

@Controller('barcodes')
export class BarcodeController {
  constructor(private readonly barcode: BarcodeService) {}

  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.barcode.list(query);
  }
}
