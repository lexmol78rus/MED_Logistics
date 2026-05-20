import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginDto): never {
    this.auth.assertLoginDto(body);
    this.auth.loginNotImplemented();
  }
}
