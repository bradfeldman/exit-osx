-- Migrate WorkspaceInvite.role from UserRole to WorkspaceRole
-- This is the final step in removing UserRole from the schema

-- Step 1: Convert existing invite roles from UserRole to WorkspaceRole
-- Map legacy UserRole values to WorkspaceRole equivalents
UPDATE "workspace_invites" SET "role" = CASE "role"::text
  WHEN 'SUPER_ADMIN' THEN 'OWNER'
  WHEN 'ADMIN' THEN 'ADMIN'
  WHEN 'TEAM_LEADER' THEN 'MEMBER'
  WHEN 'MEMBER' THEN 'MEMBER'
  WHEN 'VIEWER' THEN 'MEMBER'
  ELSE 'MEMBER'
END;

-- Step 2: Change the column type from UserRole to WorkspaceRole
ALTER TABLE "workspace_invites"
  ALTER COLUMN "role" TYPE "WorkspaceRole"
  USING "role"::text::"WorkspaceRole";

-- Step 3: Drop the UserRole enum (no longer used anywhere in schema)
DROP TYPE IF EXISTS "UserRole";
