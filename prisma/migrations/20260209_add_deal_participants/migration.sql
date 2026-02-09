-- CreateEnum
CREATE TYPE "ParticipantSide" AS ENUM ('BUYER', 'SELLER', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('DEAL_LEAD', 'DECISION_MAKER', 'DILIGENCE', 'BUYER_LEGAL', 'BUYER_FINANCE', 'BUYER_OPERATIONS', 'CPA', 'ATTORNEY', 'BROKER', 'MA_ADVISOR', 'WEALTH_PLANNER', 'COO', 'CFO', 'GM', 'KEY_EMPLOYEE', 'BOARD_MEMBER', 'BANKER', 'ESCROW_AGENT', 'INSURANCE_BROKER', 'PRIMARY_CONTACT', 'OTHER');

-- CreateTable
CREATE TABLE "deal_participants" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "deal_buyer_id" TEXT,
    "canonical_person_id" TEXT NOT NULL,
    "side" "ParticipantSide" NOT NULL DEFAULT 'SELLER',
    "role" "ParticipantRole" NOT NULL DEFAULT 'OTHER',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "data_room_access_id" TEXT,
    "vdr_access_level" "VDRAccessLevel",
    "vdr_access_granted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "deal_participants_deal_id_side_idx" ON "deal_participants"("deal_id", "side");

-- CreateIndex
CREATE INDEX "deal_participants_deal_buyer_id_idx" ON "deal_participants"("deal_buyer_id");

-- CreateIndex
CREATE INDEX "deal_participants_canonical_person_id_idx" ON "deal_participants"("canonical_person_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_participants_data_room_access_id_key" ON "deal_participants"("data_room_access_id");

-- CreateIndex
CREATE UNIQUE INDEX "deal_participants_deal_id_deal_buyer_id_canonical_person_id_key" ON "deal_participants"("deal_id", "deal_buyer_id", "canonical_person_id");

-- AddForeignKey
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_deal_buyer_id_fkey" FOREIGN KEY ("deal_buyer_id") REFERENCES "deal_buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_canonical_person_id_fkey" FOREIGN KEY ("canonical_person_id") REFERENCES "canonical_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deal_participants" ADD CONSTRAINT "deal_participants_data_room_access_id_fkey" FOREIGN KEY ("data_room_access_id") REFERENCES "data_room_access"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data Migration: Copy existing DealContact rows to DealParticipant
INSERT INTO "deal_participants" ("id", "deal_id", "deal_buyer_id", "canonical_person_id", "side", "role", "is_primary", "data_room_access_id", "vdr_access_level", "vdr_access_granted_at", "is_active", "created_at", "updated_at")
SELECT
    gen_random_uuid(),
    db."deal_id",
    dc."deal_buyer_id",
    dc."canonical_person_id",
    'BUYER'::"ParticipantSide",
    CASE dc."role"
        WHEN 'PRIMARY' THEN 'PRIMARY_CONTACT'::"ParticipantRole"
        WHEN 'DEAL_LEAD' THEN 'DEAL_LEAD'::"ParticipantRole"
        WHEN 'DECISION_MAKER' THEN 'DECISION_MAKER'::"ParticipantRole"
        WHEN 'DILIGENCE' THEN 'DILIGENCE'::"ParticipantRole"
        WHEN 'LEGAL' THEN 'BUYER_LEGAL'::"ParticipantRole"
        WHEN 'FINANCE' THEN 'BUYER_FINANCE'::"ParticipantRole"
        WHEN 'OPERATIONS' THEN 'BUYER_OPERATIONS'::"ParticipantRole"
        ELSE 'OTHER'::"ParticipantRole"
    END,
    dc."is_primary",
    NULL, -- don't copy data_room_access_id since it's 1:1 and already linked to DealContact
    dc."vdr_access_level",
    dc."vdr_access_granted_at",
    dc."is_active",
    dc."created_at",
    dc."updated_at"
FROM "deal_contacts" dc
JOIN "deal_buyers" db ON dc."deal_buyer_id" = db."id";
