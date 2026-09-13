import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Toutes les routes sauf assets statiques, API interne et fichiers Next internes.
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
