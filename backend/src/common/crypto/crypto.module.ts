import { Global, Module } from '@nestjs/common';
import { SettingsCryptoService } from './settings-crypto.service';

@Global()
@Module({
  providers: [SettingsCryptoService],
  exports: [SettingsCryptoService],
})
export class CryptoModule {}
