import { Controller, Get, Req } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Get('me')
  getCurrentUser(@Req() req: { user?: { role: string } }) {
    return { role: req.user?.role || null };
  }
}
