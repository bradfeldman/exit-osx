-- CreateTable
CREATE TABLE "task_sub_steps" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_sub_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_sub_steps_task_id_order_idx" ON "task_sub_steps"("task_id", "order");

-- AddForeignKey
ALTER TABLE "task_sub_steps" ADD CONSTRAINT "task_sub_steps_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
