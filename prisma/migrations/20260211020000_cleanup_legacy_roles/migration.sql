-- Phase 7: Drop legacy role column and UserRole enum

-- Drop the legacy 'role' column from workspace_members (replaced by workspace_role)
ALTER TABLE "workspace_members" DROP COLUMN IF EXISTS "role";

-- Note: We keep the UserRole enum for now since it may be referenced by invite tables
-- It can be dropped in a later cleanup pass when invites are also migrated
