-- RLS Phase 3: User-scoped, Org-scoped, Global, and Admin Tables

-- ============================================
-- ORG-SCOPED (personal_financials)
-- ============================================
ALTER TABLE personal_financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "personal_fin_select" ON personal_financials
  FOR SELECT USING (public.user_in_org(organization_id) OR public.is_super_admin());
CREATE POLICY "personal_fin_service_role" ON personal_financials
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- USER-SCOPED TABLES
-- ============================================

ALTER TABLE advisor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "advisor_prof_select" ON advisor_profiles
  FOR SELECT USING (user_id = public.get_prisma_user_id() OR public.is_super_admin());
CREATE POLICY "advisor_prof_service_role" ON advisor_profiles
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;
CREATE POLICY "2fa_select" ON two_factor_auth
  FOR SELECT USING (user_id = public.get_prisma_user_id() OR public.is_super_admin());
CREATE POLICY "2fa_service_role" ON two_factor_auth
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select" ON user_sessions
  FOR SELECT USING (user_id = public.get_prisma_user_id() OR public.is_super_admin());
CREATE POLICY "sessions_service_role" ON user_sessions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "consents_select" ON user_consents
  FOR SELECT USING (user_id = public.get_prisma_user_id() OR public.is_super_admin());
CREATE POLICY "consents_service_role" ON user_consents
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts_select" ON alerts
  FOR SELECT USING (recipient_id = public.get_prisma_user_id() OR public.is_super_admin());
CREATE POLICY "alerts_service_role" ON alerts
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets_select" ON support_tickets
  FOR SELECT USING (user_id = public.get_prisma_user_id() OR public.is_super_admin());
CREATE POLICY "tickets_service_role" ON support_tickets
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticket_msg_select" ON ticket_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM support_tickets st WHERE st.id = ticket_messages.ticket_id AND st.user_id = public.get_prisma_user_id())
    OR public.is_super_admin()
  );
CREATE POLICY "ticket_msg_service_role" ON ticket_messages
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deletion_req_select" ON data_deletion_requests
  FOR SELECT USING (user_id = public.get_prisma_user_id() OR public.is_super_admin());
CREATE POLICY "deletion_req_service_role" ON data_deletion_requests
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "export_req_select" ON data_export_requests
  FOR SELECT USING (user_id = public.get_prisma_user_id() OR public.is_super_admin());
CREATE POLICY "export_req_service_role" ON data_export_requests
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- GLOBAL LOOKUP TABLES (all authenticated users can read)
-- ============================================

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_select" ON questions
  FOR SELECT USING (auth.role() IS NOT NULL);
CREATE POLICY "questions_service_role" ON questions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "question_opts_select" ON question_options
  FOR SELECT USING (auth.role() IS NOT NULL);
CREATE POLICY "question_opts_service_role" ON question_options
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE industry_multiples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ind_mult_select" ON industry_multiples
  FOR SELECT USING (auth.role() IS NOT NULL);
CREATE POLICY "ind_mult_service_role" ON industry_multiples
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE role_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_templ_select" ON role_templates
  FOR SELECT USING (auth.role() IS NOT NULL);
CREATE POLICY "role_templ_service_role" ON role_templates
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE project_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proj_q_select" ON project_questions
  FOR SELECT USING (auth.role() IS NOT NULL);
CREATE POLICY "proj_q_service_role" ON project_questions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE project_question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proj_q_opts_select" ON project_question_options
  FOR SELECT USING (auth.role() IS NOT NULL);
CREATE POLICY "proj_q_opts_service_role" ON project_question_options
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE project_strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proj_strat_select" ON project_strategies
  FOR SELECT USING (auth.role() IS NOT NULL);
CREATE POLICY "proj_strat_service_role" ON project_strategies
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE project_task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proj_task_templ_select" ON project_task_templates
  FOR SELECT USING (auth.role() IS NOT NULL);
CREATE POLICY "proj_task_templ_service_role" ON project_task_templates
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sys_settings_select" ON system_settings
  FOR SELECT USING (public.is_super_admin());
CREATE POLICY "sys_settings_service_role" ON system_settings
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- ADMIN-ONLY TABLES
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_select" ON audit_logs
  FOR SELECT USING (public.is_super_admin());
CREATE POLICY "audit_logs_service_role" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imperson_select" ON impersonation_sessions
  FOR SELECT USING (public.is_super_admin());
CREATE POLICY "imperson_service_role" ON impersonation_sessions
  FOR ALL USING (auth.role() = 'service_role');
