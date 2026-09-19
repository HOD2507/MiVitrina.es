import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import { UserRole } from "@mivitrina/shared";
import { AuthService, AuthTokens } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { CheckEmailQueryDto } from "./dto/check-email-query.dto";
import { CheckBusinessIdQueryDto } from "./dto/check-business-id-query.dto";
import { UpdateAccountDto } from "./dto/update-account.dto";
import { Public } from "./decorators/public.decorator";
import { CurrentUser, AuthenticatedUser } from "./decorators/current-user.decorator";
import { JwtRefreshGuard } from "./guards/jwt-refresh.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import type { GoogleProfile } from "./strategies/google.strategy";
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

  /** Page "Ajustes" : nom et téléphone de la personne qui gère le compte — jamais le nom du commerce/de la société, qui a son propre endpoint. */
  @Patch("me")
  async updateAccount(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAccountDto) {
    return this.authService.updateAccount(user.id, dto);
  }

  /** Indique au front si le bouton "Continuer avec Google" doit être affiché. */
  @Public()
  @Get("config")
  getConfig() {
    return { googleEnabled: Boolean(this.config.get<string>("GOOGLE_CLIENT_ID")) };
  }

  /**
   * Vérification en direct (débattue côté front) pendant la saisie de
   * l'email à l'inscription/la connexion :
   * - `deliverable` : le domaine a-t-il ne serait-ce qu'une configuration
   *   mail (MX ou A/AAAA) ? Ne prouve pas que la boîte précise existe
   *   (impossible à vérifier de façon fiable sans service tiers payant —
   *   Gmail/Outlook/Yahoo ne le révèlent jamais par SMTP), mais attrape un
   *   domaine qui n'existe pas du tout ou une faute de frappe sur le TLD.
   * - `available` : aucun compte n'existe déjà avec cet email — permet de
   *   bloquer le passage à l'étape suivante du formulaire d'inscription
   *   avant même de tenter la création du compte, plutôt que de ne le
   *   découvrir qu'à la validation finale.
   */
  @Public()
  @Get("check-email")
  async checkEmail(@Query() query: CheckEmailQueryDto) {
    return this.authService.checkEmailStatus(query.email);
  }

  /** Même logique que ci-dessus pour le numéro NIF/CIF, à l'étape "commerce". */
  @Public()
  @Get("check-business-id")
  async checkBusinessId(@Query() query: CheckBusinessIdQueryDto) {
    return { available: await this.authService.isBusinessIdAvailable(query.country, query.businessIdNumber) };
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get("google")
  async googleAuth() {
    // Redirection gérée entièrement par Passport (GoogleAuthGuard) — rien à faire ici.
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get("google/callback")
  async googleAuthCallback(
    @Req() req: Request,
    @Query("state") state: string,
    @Res() res: Response,
  ) {
    const webAppUrl = this.config.get<string>("WEB_APP_URL") ?? "http://localhost:3000";
    const requestedRole = state === UserRole.COMMERCANT ? UserRole.COMMERCANT : UserRole.ANNONCEUR;

    try {
      const { tokens } = await this.authService.loginOrRegisterWithGoogle(req.user as GoogleProfile, requestedRole);
      this.setAuthCookies(res, tokens);
      res.redirect(`${webAppUrl}/dashboard`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connexion Google impossible.";
      res.redirect(`${webAppUrl}/login?error=${encodeURIComponent(message)}`);
    }
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Get("verify-email")
  async verifyEmail(@Query("token") token: string) {
    await this.authService.verifyEmail(token);
    return { ok: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post("resend-verification")
  async resendVerification(@CurrentUser() user: AuthenticatedUser) {
    await this.authService.resendVerificationEmail(user.id);
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
