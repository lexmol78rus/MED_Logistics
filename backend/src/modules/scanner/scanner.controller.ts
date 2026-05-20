import { Body, Controller, Post } from '@nestjs/common';
import { ADMIN_MANAGER_OPERATOR } from '../../common/constants/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProcessScannerDto } from './dto/process-scanner.dto';
import { ScannerService } from './scanner.service';

@Controller('scanner')
export class ScannerController {
  constructor(private readonly scanner: ScannerService) {}

  @Roles(...ADMIN_MANAGER_OPERATOR)
  @Post('process')
  process(@Body() dto: ProcessScannerDto) {
    return this.scanner.process(dto.barcode);
  }
}
