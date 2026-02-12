-- Migrate WorkspaceInvite.role from UserRole to WorkspaceRole
-- This is the final step in removing UserRole from the schema

-- Step 1: Drop the default (it references UserRole enum value)
ALTER TABLE "workspace_invites" ALTER COLUMN "role" DROP DEFAULT;

-- Step 2: Change column type from UserRole to WorkspaceRole
-- The USING clause maps old values to new in a single operation
ALTER TABLE "workspace_invites"
  ALTER COLUMN "role" TYPE "WorkspaceRole"
  USING (CASE "role"::text
    WHEN 'SUPER_ADMIN' THEN 'OWNER'
    WHEN 'ADMIN' THEN 'ADMIN'
    WHEN 'TEAM_LEADER' THEN 'MEMBER'
    WHEN 'MEMBER' THEN 'MEMBER'
    WHEN 'VIEWER' THEN 'MEMBER'
    ELSE 'MEMBER'
  END)::"WorkspaceRole";

-- Step 3: Set new default using WorkspaceRole
ALTER TABLE "workspace_invites" ALTER COLUMN "role" SET DEFAULT 'MEMBER'::"WorkspaceRole";

-- Step 4: Drop the UserRole enum (no longer used anywhere in schema)
DROP TYPE IF EXISTS "UserRole";
