import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { AuthService, AuthTokens } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser, AuthenticatedUser } from "./decorators/current-user.decorator";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { ACCESS_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE_MAX_AGE_MS, REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE_MAX_AGE_MS } from "./auth.constants";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.register(dto);
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.authService.login(dto);
    this.setAuthCookies(res, tokens);
    return { user };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @Post("refresh")
  async refresh(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(user.id);
    this.setAuthCookies(res, tokens);
    return { ok: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post("logout")
  async logout(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @Get("me")
  async me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Get("verify-email")
  async verifyEmail(@Query("token") token: string) {
    await this.authService.verifyEmail(token);
    return { ok: true };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // Réponse générique dans tous les cas (l'email existe ou non).
    return { ok: true };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { ok: true };
  }

  // ---------------------------------------------------------------------

  private setAuthCookies(res: Response, tokens: AuthTokens) {
    const isProduction = this.config.get<string>("NODE_ENV") === "production";
    const domain = this.config.get<string>("COOKIE_DOMAIN") || undefined;

    res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      domain,
      path: "/",
      maxAge: ACCESS_TOKEN_COOKIE_MAX_AGE_MS,
    });

    res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      domain,
      // Le refresh token n'est envoyé qu'à /api/auth/refresh et /api/auth/logout.
      path: "/api/auth",
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE_MS,
    });
  }

  private clearAuthCookies(res: Response) {
    const domain = this.config.get<string>("COOKIE_DOMAIN") || undefined;
    res.clearCookie(ACCESS_TOKEN_COOKIE, { path: "/", domain });
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/api/auth", domain });
  }
}
