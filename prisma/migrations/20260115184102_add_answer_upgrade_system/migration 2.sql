-- AlterTable
ALTER TABLE "assessment_responses" ADD COLUMN     "effective_option_id" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "upgrades_from_option_id" TEXT,
ADD COLUMN     "upgrades_to_option_id" TEXT;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_effective_option_id_fkey" FOREIGN KEY ("effective_option_id") REFERENCES "question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_upgrades_from_option_id_fkey" FOREIGN KEY ("upgrades_from_option_id") REFERENCES "question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_upgrades_to_option_id_fkey" FOREIGN KEY ("upgrades_to_option_id") REFERENCES "question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
