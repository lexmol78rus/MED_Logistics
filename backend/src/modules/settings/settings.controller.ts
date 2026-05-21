import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ADMIN_ONLY, READ_ROLES } from '../../common/constants/roles';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../../common/interfaces/jwt-user.interface';
import { PatchMailSettingsDto } from './dto/patch-mail-settings.dto';
import { TestMailDto } from './dto/patch-mail-settings.dto';
import { PatchSettingsDto } from './dto/patch-settings.dto';
import { SettingsMailService } from './settings-mail.service';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly settingsMail: SettingsMailService,
  ) {}

  @Roles(...READ_ROLES)
  @Get()
  get() {
    return this.settings.get();
  }

  @Roles(...ADMIN_ONLY)
  @Patch()
  patch(@Body() dto: PatchSettingsDto, @CurrentUser() user?: JwtUser) {
    return this.settings.patch(dto, user?.userId, user?.email);
  }

  @Roles(...ADMIN_ONLY)
  @Get('mail')
  getMail() {
    return this.settingsMail.getMailSettings();
  }

  @Roles(...ADMIN_ONLY)
  @Patch('mail')
  patchMail(
    @Body() dto: PatchMailSettingsDto,
    @CurrentUser() user?: JwtUser,
  ) {
    if (process.env.SETTINGS_MAIL_PATCH_STUB === '1') {
      return { ok: true, stub: true, dto };
    }
    return this.settingsMail.patchMailSettings(
      dto,
      user?.userId,
      user?.email,
    );
  }

  @Roles(...ADMIN_ONLY)
  @Post('mail/test')
  testMail(@Body() dto: TestMailDto, @CurrentUser() user?: JwtUser) {
    return this.settingsMail.testMail(dto.to, user?.userId);
  }
}
