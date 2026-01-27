-- RLS Phase 1: Core Access Control Tables
-- This migration enables RLS on the foundational tables that control user access
-- NOTE: Helper functions use public schema (not auth) due to Supabase permissions

-- ============================================
-- Helper Functions (in public schema)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_prisma_user_id()
RETURNS TEXT AS $$
  SELECT id FROM users WHERE auth_id = auth.uid()::text;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM users WHERE auth_id = auth.uid()::text),
    false
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_in_org(org_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN users u ON u.id = ou.user_id
    WHERE u.auth_id = auth.uid()::text
    AND ou.organization_id = org_id
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.user_can_access_company(comp_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  prisma_user_id TEXT;
  company_org_id TEXT;
BEGIN
  SELECT id INTO prisma_user_id FROM users WHERE auth_id = auth.uid()::text;
  IF prisma_user_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM company_ownerships
    WHERE company_id = comp_id AND user_id = prisma_user_id AND status = 'ACTIVE'
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM company_staff_access
    WHERE company_id = comp_id AND user_id = prisma_user_id AND status = 'ACTIVE'
  ) THEN
    RETURN true;
  END IF;

  SELECT organization_id INTO company_org_id FROM companies WHERE id = comp_id;
  IF EXISTS (
    SELECT 1 FROM organization_users
    WHERE organization_id = company_org_id AND user_id = prisma_user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 1. USERS TABLE
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth_id = auth.uid()::text);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth_id = auth.uid()::text);

CREATE POLICY "users_select_admin" ON users
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "users_service_role" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 2. ORGANIZATIONS TABLE
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select_member" ON organizations
  FOR SELECT USING (public.user_in_org(id));

CREATE POLICY "orgs_select_admin" ON organizations
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "orgs_service_role" ON organizations
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 3. ORGANIZATION_USERS TABLE
-- ============================================
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_users_select" ON organization_users
  FOR SELECT USING (public.user_in_org(organization_id));

CREATE POLICY "org_users_select_admin" ON organization_users
  FOR SELECT USING (public.is_super_admin());

CREATE POLICY "org_users_service_role" ON organization_users
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 4. MEMBER_PERMISSIONS TABLE
-- ============================================
ALTER TABLE member_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_perms_select" ON member_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.id = member_permissions.organization_user_id
      AND public.user_in_org(ou.organization_id)
    )
  );

CREATE POLICY "member_perms_service_role" ON member_permissions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 5. COMPANIES TABLE
-- ============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (
    public.user_can_access_company(id)
    OR public.is_super_admin()
  );

CREATE POLICY "companies_service_role" ON companies
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 6. COMPANY_OWNERSHIPS TABLE
-- ============================================
ALTER TABLE company_ownerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_ownerships_select" ON company_ownerships
  FOR SELECT USING (
    public.user_can_access_company(company_id)
    OR public.is_super_admin()
  );

CREATE POLICY "company_ownerships_service_role" ON company_ownerships
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 7. COMPANY_STAFF_ACCESS TABLE
-- ============================================
ALTER TABLE company_staff_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_staff_select" ON company_staff_access
  FOR SELECT USING (
    public.user_can_access_company(company_id)
    OR public.is_super_admin()
  );

CREATE POLICY "company_staff_service_role" ON company_staff_access
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- 8. ORGANIZATION_INVITES TABLE
-- ============================================
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_invites_select" ON organization_invites
  FOR SELECT USING (
    public.user_in_org(organization_id)
    OR public.is_super_admin()
  );

CREATE POLICY "org_invites_service_role" ON organization_invites
  FOR ALL USING (auth.role() = 'service_role');
