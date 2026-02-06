-- DropIndex
DROP INDEX IF EXISTS "tasks_sprint_id_idx";

-- AlterTable: Remove sprint columns from tasks
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "sprint_id";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "sprint_priority";

-- DropTable
DROP TABLE IF EXISTS "sprints";

-- DropEnum
DROP TYPE IF EXISTS "SprintPriority";
DROP TYPE IF EXISTS "SprintStatus";
