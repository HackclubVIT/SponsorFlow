import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['nodemailer', '@prisma/client'],
};

export default nextConfig;
