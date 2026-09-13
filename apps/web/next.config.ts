import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // À compléter avec le domaine du bucket S3 une fois configuré.
    ],
  },
};

export default withNextIntl(nextConfig);
