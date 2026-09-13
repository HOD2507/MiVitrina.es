import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Abstraction d'envoi d'email. Utilise Resend si RESEND_API_KEY est
 * configurée ; sinon, log le contenu en console (dev local sans clé,
 * CI...). Ça permet de développer et tester tout le flux d'auth
 * (vérification email, mot de passe oublié) sans compte Resend.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("RESEND_API_KEY");
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromEmail = this.config.get<string>("RESEND_FROM_EMAIL")!;
  }

  async send({ to, subject, html }: SendMailInput): Promise<void> {
    if (!this.resend) {
      this.logger.warn(
        `[dev-mail] RESEND_API_KEY absente — email non envoyé, affiché ci-dessous.\n` +
          `To: ${to}\nSubject: ${subject}\n${html}`,
      );
      return;
    }

    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject,
      html,
    });
  }
}
