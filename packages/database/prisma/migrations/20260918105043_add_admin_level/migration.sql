-- CreateEnum
CREATE TYPE "AdminLevel" AS ENUM ('SUPERADMIN', 'SUPPORT', 'FINANCE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "adminLevel" "AdminLevel";
