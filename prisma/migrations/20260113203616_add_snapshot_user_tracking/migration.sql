-- AlterTable
ALTER TABLE "valuation_snapshots" ADD COLUMN     "created_by_user_id" TEXT;

-- AddForeignKey
ALTER TABLE "valuation_snapshots" ADD CONSTRAINT "valuation_snapshots_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
