-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "DossierBuildType" AS ENUM ('FULL', 'INCREMENTAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "company_dossiers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "build_type" "DossierBuildType" NOT NULL,
    "trigger_event" TEXT NOT NULL,
    "trigger_source" TEXT,
    "content" JSONB NOT NULL,
    "content_hash" TEXT NOT NULL,
    "sections" TEXT[],
    "previous_id" TEXT,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_dossiers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "company_dossiers_company_id_is_current_idx" ON "company_dossiers"("company_id", "is_current");

-- AddForeignKey (company)
ALTER TABLE "company_dossiers" ADD CONSTRAINT "company_dossiers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (self-referencing versions)
ALTER TABLE "company_dossiers" ADD CONSTRAINT "company_dossiers_previous_id_fkey" FOREIGN KEY ("previous_id") REFERENCES "company_dossiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
