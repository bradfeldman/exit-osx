-- CreateEnum
CREATE TYPE "ExposureState" AS ENUM ('LEARNING', 'VIEWING', 'ACTING');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "exposure_state" "ExposureState" NOT NULL DEFAULT 'LEARNING';
