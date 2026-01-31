-- Contact System Canonical Layer Migration
-- Creates the canonical data layer for companies, people, and deal tracking

-- ============================================
-- CREATE ENUMS
-- ============================================

-- Data Quality enum
CREATE TYPE "DataQuality" AS ENUM ('PROVISIONAL', 'SUGGESTED', 'VERIFIED', 'ENRICHED');

-- Company Group Type enum
CREATE TYPE "CompanyGroupType" AS ENUM ('PE_FAMILY', 'CONGLOMERATE', 'ALLIANCE', 'OTHER');

-- Company Group Relationship enum
CREATE TYPE "CompanyGroupRelationship" AS ENUM ('PARENT', 'SUBSIDIARY', 'PORTFOLIO_COMPANY', 'FUND', 'AFFILIATE', 'MEMBER');

-- Duplicate Entity Type enum
CREATE TYPE "DuplicateEntityType" AS ENUM ('COMPANY', 'PERSON');

-- Duplicate Status enum
CREATE TYPE "DuplicateStatus" AS ENUM ('PENDING', 'RESOLVED', 'SKIPPED');

-- Duplicate Resolution enum
CREATE TYPE "DuplicateResolution" AS ENUM ('MERGED', 'NOT_DUPLICATE', 'SKIPPED');

-- Deal Status enum
CREATE TYPE "DealStatus" AS ENUM ('ACTIVE', 'CLOSED', 'TERMINATED', 'ON_HOLD');

-- Approval Status enum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'HOLD', 'DENIED');

-- VDR Access Level enum
CREATE TYPE "VDRAccessLevel" AS ENUM ('NONE', 'TEASER', 'POST_NDA', 'LEVEL_2', 'LEVEL_3', 'FULL');

-- Activity Type enum
CREATE TYPE "ActivityType" AS ENUM ('EMAIL_SENT', 'EMAIL_RECEIVED', 'CALL_OUTBOUND', 'CALL_INBOUND', 'MEETING_SCHEDULED', 'MEETING_COMPLETED', 'MEETING_CANCELLED', 'NOTE_ADDED', 'STAGE_CHANGED', 'DOCUMENT_SENT', 'DOCUMENT_RECEIVED', 'VDR_ACCESS_GRANTED', 'VDR_ACCESS_REVOKED', 'APPROVAL_REQUESTED', 'APPROVAL_GRANTED', 'APPROVAL_DENIED');

-- Activity Outcome enum
CREATE TYPE "ActivityOutcome" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'NO_RESPONSE');

-- Meeting Status enum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- Email Status enum
CREATE TYPE "EmailStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'REPLIED', 'BOUNCED', 'FAILED');

-- ============================================
-- CREATE CANONICAL LAYER TABLES
-- ============================================

-- Canonical Companies
CREATE TABLE "canonical_companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "legal_name" TEXT,
    "website" TEXT,
    "linkedin_url" TEXT,
    "company_type" "BuyerType" NOT NULL DEFAULT 'OTHER',
    "industry_code" TEXT,
    "industry_name" TEXT,
    "headquarters" TEXT,
    "country" TEXT,
    "employee_count" INTEGER,
    "founded_year" INTEGER,
    "aum" DECIMAL(15,2),
    "description" TEXT,
    "data_quality" "DataQuality" NOT NULL DEFAULT 'PROVISIONAL',
    "verified_at" TIMESTAMP(3),
    "verified_by_user_id" TEXT,
    "merged_into_id" TEXT,
    "merged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canonical_companies_pkey" PRIMARY KEY ("id")
);

-- Canonical People
CREATE TABLE "canonical_people" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "email" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "linkedin_url" TEXT,
    "current_title" TEXT,
    "current_company_id" TEXT,
    "data_quality" "DataQuality" NOT NULL DEFAULT 'PROVISIONAL',
    "verified_at" TIMESTAMP(3),
    "merged_into_id" TEXT,
    "merged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "canonical_people_pkey" PRIMARY KEY ("id")
);

-- Canonical Domains
CREATE TABLE "canonical_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canonical_domains_pkey" PRIMARY KEY ("id")
);

-- Person Employment
CREATE TABLE "person_employment" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_employment_pkey" PRIMARY KEY ("id")
);

-- Company Groups
CREATE TABLE "company_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "group_type" "CompanyGroupType" NOT NULL DEFAULT 'OTHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_groups_pkey" PRIMARY KEY ("id")
);

-- Company Group Members
CREATE TABLE "company_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "relationship" "CompanyGroupRelationship" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_group_members_pkey" PRIMARY KEY ("id")
);

-- Duplicate Candidates
CREATE TABLE "duplicate_candidates" (
    "id" TEXT NOT NULL,
    "entity_type" "DuplicateEntityType" NOT NULL,
    "company_a_id" TEXT,
    "company_b_id" TEXT,
    "person_a_id" TEXT,
    "person_b_id" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "match_reasons" JSONB NOT NULL,
    "status" "DuplicateStatus" NOT NULL DEFAULT 'PENDING',
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" TEXT,
    "resolution" "DuplicateResolution",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_candidates_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- CREATE DEAL LAYER TABLES
-- ============================================

-- Deals
CREATE TABLE "deals" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code_name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DealStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "target_close_date" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "terminated_at" TIMESTAMP(3),
    "require_seller_approval" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT NOT NULL,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- Deal Buyers
CREATE TABLE "deal_buyers" (
    "id" TEXT NOT NULL,
    "deal_id" TEXT NOT NULL,
    "canonical_company_id" TEXT NOT NULL,
    "tier" "BuyerTier" NOT NULL DEFAULT 'B_TIER',
    "buyer_rationale" TEXT,
    "current_stage" "DealStage" NOT NULL DEFAULT 'IDENTIFIED',
    "stage_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approval_note" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by_user_id" TEXT,
    "teaser_sent_at" TIMESTAMP(3),
    "nda_executed_at" TIMESTAMP(3),
    "cim_access_at" TIMESTAMP(3),
    "ioi_received_at" TIMESTAMP(3),
    "loi_received_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "exited_at" TIMESTAMP(3),
    "exit_reason" TEXT,
    "ioi_amount" DECIMAL(15,2),
    "ioi_deadline" TIMESTAMP(3),
    "loi_amount" DECIMAL(15,2),
    "loi_deadline" TIMESTAMP(3),
    "exclusivity_start" TIMESTAMP(3),
    "exclusivity_end" TIMESTAMP(3),
    "internal_notes" TEXT,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT NOT NULL,

    CONSTRAINT "deal_buyers_pkey" PRIMARY KEY ("id")
);

-- Deal Contacts
CREATE TABLE "deal_contacts" (
    "id" TEXT NOT NULL,
    "deal_buyer_id" TEXT NOT NULL,
    "canonical_person_id" TEXT NOT NULL,
    "role" "BuyerContactRole" NOT NULL DEFAULT 'DEAL_LEAD',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "data_room_access_id" TEXT,
    "vdr_access_level" "VDRAccessLevel",
    "vdr_access_granted_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_contacts_pkey" PRIMARY KEY ("id")
);

-- Deal Stage History v2
CREATE TABLE "deal_stage_history_v2" (
    "id" TEXT NOT NULL,
    "deal_buyer_id" TEXT NOT NULL,
    "from_stage" "DealStage",
    "to_stage" "DealStage" NOT NULL,
    "note" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed_by_user_id" TEXT NOT NULL,

    CONSTRAINT "deal_stage_history_v2_pkey" PRIMARY KEY ("id")
);

-- Deal Activities v2
CREATE TABLE "deal_activities_v2" (
    "id" TEXT NOT NULL,
    "deal_buyer_id" TEXT,
    "deal_id" TEXT NOT NULL,
    "activity_type" "ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "outcome" "ActivityOutcome",
    "person_id" TEXT,
    "document_id" TEXT,
    "meeting_id" TEXT,
    "metadata" JSONB,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "performed_by_user_id" TEXT NOT NULL,

    CONSTRAINT "deal_activities_v2_pkey" PRIMARY KEY ("id")
);

-- Deal Documents v2
CREATE TABLE "deal_documents_v2" (
    "id" TEXT NOT NULL,
    "deal_buyer_id" TEXT NOT NULL,
    "document_type" "DealDocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "file_path" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "received_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,

    CONSTRAINT "deal_documents_v2_pkey" PRIMARY KEY ("id")
);

-- Deal Meetings v2
CREATE TABLE "deal_meetings_v2" (
    "id" TEXT NOT NULL,
    "deal_buyer_id" TEXT NOT NULL,
    "meeting_type" "MeetingType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER,
    "location" TEXT,
    "meeting_link" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "notes" TEXT,
    "attendees" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" TEXT NOT NULL,

    CONSTRAINT "deal_meetings_v2_pkey" PRIMARY KEY ("id")
);

-- Email Attempts
CREATE TABLE "email_attempts" (
    "id" TEXT NOT NULL,
    "deal_buyer_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template_used" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "clicked_at" TIMESTAMP(3),
    "replied_at" TIMESTAMP(3),
    "bounced_at" TIMESTAMP(3),
    "bounce_reason" TEXT,
    "status" "EmailStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_user_id" TEXT NOT NULL,

    CONSTRAINT "email_attempts_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- CREATE UNIQUE CONSTRAINTS
-- ============================================

CREATE UNIQUE INDEX "canonical_people_email_key" ON "canonical_people"("email");
CREATE UNIQUE INDEX "canonical_domains_domain_key" ON "canonical_domains"("domain");
CREATE UNIQUE INDEX "company_group_members_group_id_company_id_key" ON "company_group_members"("group_id", "company_id");
CREATE UNIQUE INDEX "deals_company_id_code_name_key" ON "deals"("company_id", "code_name");
CREATE UNIQUE INDEX "deal_buyers_deal_id_canonical_company_id_key" ON "deal_buyers"("deal_id", "canonical_company_id");
CREATE UNIQUE INDEX "deal_contacts_data_room_access_id_key" ON "deal_contacts"("data_room_access_id");
CREATE UNIQUE INDEX "deal_contacts_deal_buyer_id_canonical_person_id_key" ON "deal_contacts"("deal_buyer_id", "canonical_person_id");

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Canonical Companies indexes
CREATE INDEX "canonical_companies_normalized_name_idx" ON "canonical_companies"("normalized_name");
CREATE INDEX "canonical_companies_website_idx" ON "canonical_companies"("website");
CREATE INDEX "canonical_companies_data_quality_idx" ON "canonical_companies"("data_quality");
CREATE INDEX "canonical_companies_company_type_idx" ON "canonical_companies"("company_type");
CREATE INDEX "canonical_companies_merged_into_id_idx" ON "canonical_companies"("merged_into_id");

-- Canonical People indexes
CREATE INDEX "canonical_people_normalized_name_idx" ON "canonical_people"("normalized_name");
CREATE INDEX "canonical_people_email_idx" ON "canonical_people"("email");
CREATE INDEX "canonical_people_current_company_id_idx" ON "canonical_people"("current_company_id");
CREATE INDEX "canonical_people_merged_into_id_idx" ON "canonical_people"("merged_into_id");

-- Canonical Domains indexes
CREATE INDEX "canonical_domains_company_id_idx" ON "canonical_domains"("company_id");

-- Person Employment indexes
CREATE INDEX "person_employment_person_id_idx" ON "person_employment"("person_id");
CREATE INDEX "person_employment_company_id_idx" ON "person_employment"("company_id");
CREATE INDEX "person_employment_person_id_is_current_idx" ON "person_employment"("person_id", "is_current");

-- Duplicate Candidates indexes
CREATE INDEX "duplicate_candidates_entity_type_status_idx" ON "duplicate_candidates"("entity_type", "status");
CREATE INDEX "duplicate_candidates_confidence_idx" ON "duplicate_candidates"("confidence");

-- Deals indexes
CREATE INDEX "deals_company_id_idx" ON "deals"("company_id");
CREATE INDEX "deals_status_idx" ON "deals"("status");

-- Deal Buyers indexes
CREATE INDEX "deal_buyers_deal_id_current_stage_idx" ON "deal_buyers"("deal_id", "current_stage");
CREATE INDEX "deal_buyers_deal_id_approval_status_idx" ON "deal_buyers"("deal_id", "approval_status");
CREATE INDEX "deal_buyers_canonical_company_id_idx" ON "deal_buyers"("canonical_company_id");

-- Deal Contacts indexes
CREATE INDEX "deal_contacts_canonical_person_id_idx" ON "deal_contacts"("canonical_person_id");

-- Deal Stage History v2 indexes
CREATE INDEX "deal_stage_history_v2_deal_buyer_id_changed_at_idx" ON "deal_stage_history_v2"("deal_buyer_id", "changed_at");

-- Deal Activities v2 indexes
CREATE INDEX "deal_activities_v2_deal_buyer_id_performed_at_idx" ON "deal_activities_v2"("deal_buyer_id", "performed_at");
CREATE INDEX "deal_activities_v2_deal_id_performed_at_idx" ON "deal_activities_v2"("deal_id", "performed_at");
CREATE INDEX "deal_activities_v2_activity_type_idx" ON "deal_activities_v2"("activity_type");

-- Deal Documents v2 indexes
CREATE INDEX "deal_documents_v2_deal_buyer_id_document_type_idx" ON "deal_documents_v2"("deal_buyer_id", "document_type");

-- Deal Meetings v2 indexes
CREATE INDEX "deal_meetings_v2_deal_buyer_id_scheduled_at_idx" ON "deal_meetings_v2"("deal_buyer_id", "scheduled_at");
CREATE INDEX "deal_meetings_v2_status_idx" ON "deal_meetings_v2"("status");

-- Email Attempts indexes
CREATE INDEX "email_attempts_deal_buyer_id_idx" ON "email_attempts"("deal_buyer_id");
CREATE INDEX "email_attempts_person_id_idx" ON "email_attempts"("person_id");
CREATE INDEX "email_attempts_status_idx" ON "email_attempts"("status");

-- ============================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================

-- Canonical Companies self-reference for merges
ALTER TABLE "canonical_companies" ADD CONSTRAINT "canonical_companies_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "canonical_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Canonical People relationships
ALTER TABLE "canonical_people" ADD CONSTRAINT "canonical_people_current_company_id_fkey" FOREIGN KEY ("current_company_id") REFERENCES "canonical_companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "canonical_people" ADD CONSTRAINT "canonical_people_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "canonical_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Canonical Domains
ALTER TABLE "canonical_domains" ADD CONSTRAINT "canonical_domains_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "canonical_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Person Employment
ALTER TABLE "person_employment" ADD CONSTRAINT "person_employment_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "canonical_people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "person_employment" ADD CONSTRAINT "person_employment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "canonical_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Company Group Members
ALTER TABLE "company_group_members" ADD CONSTRAINT "company_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "company_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_group_members" ADD CONSTRAINT "company_group_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "canonical_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deals
ALTER TABLE "deals" ADD CONSTRAINT "deals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deal Buyers
ALTER TABLE "deal_buyers" ADD CONSTRAINT "deal_buyers_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_buyers" ADD CONSTRAINT "deal_buyers_canonical_company_id_fkey" FOREIGN KEY ("canonical_company_id") REFERENCES "canonical_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deal Contacts
ALTER TABLE "deal_contacts" ADD CONSTRAINT "deal_contacts_deal_buyer_id_fkey" FOREIGN KEY ("deal_buyer_id") REFERENCES "deal_buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_contacts" ADD CONSTRAINT "deal_contacts_canonical_person_id_fkey" FOREIGN KEY ("canonical_person_id") REFERENCES "canonical_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deal_contacts" ADD CONSTRAINT "deal_contacts_data_room_access_id_fkey" FOREIGN KEY ("data_room_access_id") REFERENCES "data_room_access"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Deal Stage History v2
ALTER TABLE "deal_stage_history_v2" ADD CONSTRAINT "deal_stage_history_v2_deal_buyer_id_fkey" FOREIGN KEY ("deal_buyer_id") REFERENCES "deal_buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deal Activities v2
ALTER TABLE "deal_activities_v2" ADD CONSTRAINT "deal_activities_v2_deal_buyer_id_fkey" FOREIGN KEY ("deal_buyer_id") REFERENCES "deal_buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_activities_v2" ADD CONSTRAINT "deal_activities_v2_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deal_activities_v2" ADD CONSTRAINT "deal_activities_v2_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "canonical_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Deal Documents v2
ALTER TABLE "deal_documents_v2" ADD CONSTRAINT "deal_documents_v2_deal_buyer_id_fkey" FOREIGN KEY ("deal_buyer_id") REFERENCES "deal_buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deal Meetings v2
ALTER TABLE "deal_meetings_v2" ADD CONSTRAINT "deal_meetings_v2_deal_buyer_id_fkey" FOREIGN KEY ("deal_buyer_id") REFERENCES "deal_buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Email Attempts
ALTER TABLE "email_attempts" ADD CONSTRAINT "email_attempts_deal_buyer_id_fkey" FOREIGN KEY ("deal_buyer_id") REFERENCES "deal_buyers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_attempts" ADD CONSTRAINT "email_attempts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "canonical_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
