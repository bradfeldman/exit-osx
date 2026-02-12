-- Phase 5: Rename Organization -> Workspace
-- This migration renames tables, columns, indexes, constraints, and RLS policies.
-- PostgreSQL table renames are metadata-only operations (near-instant, no data movement).

-- ============================================================
-- 1. RENAME TABLES
-- ============================================================

ALTER TABLE "organizations" RENAME TO "workspaces";
ALTER TABLE "organization_users" RENAME TO "workspace_members";
ALTER TABLE "organization_invites" RENAME TO "workspace_invites";

-- ============================================================
-- 2. RENAME FOREIGN KEY COLUMNS
-- ============================================================

ALTER TABLE "workspace_members" RENAME COLUMN "organization_id" TO "workspace_id";
ALTER TABLE "workspace_invites" RENAME COLUMN "organization_id" TO "workspace_id";
ALTER TABLE "companies" RENAME COLUMN "organization_id" TO "workspace_id";

-- ============================================================
-- 3. DROP organization_id FROM personal_financials
--    (Already optional from Phase 4 PFS re-scope to user)
-- ============================================================

-- Drop the FK constraint first if it exists
ALTER TABLE "personal_financials" DROP CONSTRAINT IF EXISTS "personal_financials_organization_id_fkey";
ALTER TABLE "personal_financials" DROP COLUMN IF EXISTS "organization_id";

-- ============================================================
-- 4. ADD workspace_role COLUMN TO workspace_members
-- ============================================================

ALTER TABLE "workspace_members" ADD COLUMN "workspace_role" "WorkspaceRole";

-- Backfill workspace_role from legacy role column
UPDATE "workspace_members" SET "workspace_role" = CASE "role"
  WHEN 'SUPER_ADMIN' THEN 'OWNER'::"WorkspaceRole"
  WHEN 'ADMIN' THEN 'ADMIN'::"WorkspaceRole"
  WHEN 'TEAM_LEADER' THEN 'MEMBER'::"WorkspaceRole"
  WHEN 'MEMBER' THEN 'MEMBER'::"WorkspaceRole"
  WHEN 'VIEWER' THEN 'MEMBER'::"WorkspaceRole"
END;

-- Make workspace_role required after backfill
ALTER TABLE "workspace_members" ALTER COLUMN "workspace_role" SET NOT NULL;
ALTER TABLE "workspace_members" ALTER COLUMN "workspace_role" SET DEFAULT 'MEMBER'::"WorkspaceRole";

-- ============================================================
-- 5. RENAME PRIMARY KEY CONSTRAINTS
--    (PostgreSQL auto-renames PKs with table, but be explicit)
-- ============================================================

ALTER INDEX IF EXISTS "organizations_pkey" RENAME TO "workspaces_pkey";
ALTER INDEX IF EXISTS "organization_users_pkey" RENAME TO "workspace_members_pkey";
ALTER INDEX IF EXISTS "organization_invites_pkey" RENAME TO "workspace_invites_pkey";

-- ============================================================
-- 6. RENAME UNIQUE INDEXES
-- ============================================================

ALTER INDEX IF EXISTS "organization_users_organization_id_user_id_key" RENAME TO "workspace_members_workspace_id_user_id_key";
ALTER INDEX IF EXISTS "organization_invites_organization_id_email_key" RENAME TO "workspace_invites_workspace_id_email_key";
ALTER INDEX IF EXISTS "organization_invites_token_key" RENAME TO "workspace_invites_token_key";

-- Stripe unique indexes on workspaces (renamed from organizations)
ALTER INDEX IF EXISTS "organizations_stripe_customer_id_key" RENAME TO "workspaces_stripe_customer_id_key";
ALTER INDEX IF EXISTS "organizations_stripe_subscription_id_key" RENAME TO "workspaces_stripe_subscription_id_key";

-- ============================================================
-- 7. RENAME FOREIGN KEY CONSTRAINTS
-- ============================================================

-- workspace_members (formerly organization_users)
ALTER TABLE "workspace_members" RENAME CONSTRAINT "organization_users_organization_id_fkey" TO "workspace_members_workspace_id_fkey";
ALTER TABLE "workspace_members" RENAME CONSTRAINT "organization_users_user_id_fkey" TO "workspace_members_user_id_fkey";
ALTER TABLE "workspace_members" RENAME CONSTRAINT "organization_users_role_template_id_fkey" TO "workspace_members_role_template_id_fkey";

-- workspace_invites (formerly organization_invites)
ALTER TABLE "workspace_invites" RENAME CONSTRAINT "organization_invites_organization_id_fkey" TO "workspace_invites_workspace_id_fkey";
ALTER TABLE "workspace_invites" RENAME CONSTRAINT "organization_invites_invited_by_fkey" TO "workspace_invites_invited_by_fkey";
ALTER TABLE "workspace_invites" RENAME CONSTRAINT "organization_invites_role_template_id_fkey" TO "workspace_invites_role_template_id_fkey";

-- companies FK to workspaces
ALTER TABLE "companies" RENAME CONSTRAINT "companies_organization_id_fkey" TO "companies_workspace_id_fkey";

-- member_permissions FK (column name stays organization_user_id but FK now targets workspace_members)
-- PostgreSQL automatically updates FK target when the referenced table is renamed.
-- We only rename the constraint for clarity.
ALTER TABLE "member_permissions" RENAME CONSTRAINT "member_permissions_organization_user_id_fkey" TO "member_permissions_workspace_member_id_fkey";

-- ============================================================
-- 8. UPDATE RLS POLICIES
--    RLS policies reference old table names in their definitions.
--    We need to drop and recreate them with new references.
-- ============================================================

-- 8a. Drop existing RLS policies on renamed tables
-- (Policies are attached to tables; when tables are renamed, policies stay but their internal SQL may reference old names)

-- Workspaces (formerly organizations) policies
DROP POLICY IF EXISTS "orgs_select_member" ON "workspaces";
DROP POLICY IF EXISTS "orgs_select_admin" ON "workspaces";
DROP POLICY IF EXISTS "orgs_service_role" ON "workspaces";

-- Workspace members (formerly organization_users) policies
DROP POLICY IF EXISTS "org_users_select" ON "workspace_members";
DROP POLICY IF EXISTS "org_users_select_admin" ON "workspace_members";
DROP POLICY IF EXISTS "org_users_service_role" ON "workspace_members";

-- Workspace invites (formerly organization_invites) policies
DROP POLICY IF EXISTS "org_invites_select" ON "workspace_invites";
DROP POLICY IF EXISTS "org_invites_service_role" ON "workspace_invites";

-- 8b. Update helper functions that reference old table/column names

-- Recreate user_in_org function to use new table/column names
CREATE OR REPLACE FUNCTION public.user_in_org(org_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE u.auth_id = (SELECT auth.uid()::text)
    AND wm.workspace_id = org_id
  );
$$;

-- Recreate user_in_company function to use new table/column names
CREATE OR REPLACE FUNCTION public.user_in_company(comp_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM (
      SELECT workspace_id FROM companies WHERE id = comp_id
    ) c
    JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
    JOIN users u ON u.id = wm.user_id
    WHERE u.auth_id = (SELECT auth.uid()::text)
  );
$$;

-- Recreate user_can_access_company function to use new table/column names
CREATE OR REPLACE FUNCTION public.user_can_access_company(comp_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  prisma_user_id TEXT;
  company_ws_id TEXT;
BEGIN
  SELECT id INTO prisma_user_id FROM users WHERE auth_id = auth.uid()::text;
  IF prisma_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check company ownership
  IF EXISTS (
    SELECT 1 FROM company_ownerships
    WHERE company_id = comp_id AND user_id = prisma_user_id AND status = 'ACTIVE'
  ) THEN
    RETURN true;
  END IF;

  -- Check company staff access
  IF EXISTS (
    SELECT 1 FROM company_staff_access
    WHERE company_id = comp_id AND user_id = prisma_user_id AND status = 'ACTIVE'
  ) THEN
    RETURN true;
  END IF;

  -- Check company member (Phase 1 model)
  IF EXISTS (
    SELECT 1 FROM company_members
    WHERE company_id = comp_id AND user_id = prisma_user_id
  ) THEN
    RETURN true;
  END IF;

  -- Check workspace membership (renamed from organization_users)
  SELECT workspace_id INTO company_ws_id FROM companies WHERE id = comp_id;
  IF EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = company_ws_id AND user_id = prisma_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 8c. Recreate RLS policies with new table/column references

-- Workspaces table policies
CREATE POLICY "ws_select_member" ON "workspaces"
  FOR SELECT USING (public.user_in_org(id));
CREATE POLICY "ws_select_admin" ON "workspaces"
  FOR SELECT USING ((SELECT auth.uid()::text) IN (SELECT u.auth_id FROM users u WHERE u.is_super_admin = true));
CREATE POLICY "ws_service_role" ON "workspaces"
  FOR ALL USING (auth.role() = 'service_role');

-- Workspace members table policies
CREATE POLICY "ws_members_select" ON "workspace_members"
  FOR SELECT USING (public.user_in_org(workspace_id));
CREATE POLICY "ws_members_select_admin" ON "workspace_members"
  FOR SELECT USING ((SELECT auth.uid()::text) IN (SELECT u.auth_id FROM users u WHERE u.is_super_admin = true));
CREATE POLICY "ws_members_service_role" ON "workspace_members"
  FOR ALL USING (auth.role() = 'service_role');

-- Workspace invites table policies
CREATE POLICY "ws_invites_select" ON "workspace_invites"
  FOR SELECT USING (
    public.user_in_org(workspace_id)
    OR email = (SELECT u.email FROM users u WHERE u.auth_id = (SELECT auth.uid()::text))
  );
CREATE POLICY "ws_invites_service_role" ON "workspace_invites"
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- 9. UPDATE personal_financials RLS POLICY
--    The old policy referenced organization_id which is now dropped.
--    PFS is now user-scoped (Phase 4), so use user_id instead.
-- ============================================================

DROP POLICY IF EXISTS "personal_fin_select" ON "personal_financials";
CREATE POLICY "personal_fin_select" ON "personal_financials"
  FOR SELECT USING (user_id = public.get_prisma_user_id() OR public.is_super_admin());
