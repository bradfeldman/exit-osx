-- RLS Phase 2: Company-Scoped Data Tables (CORRECTED)
-- These tables all have company_id and use the user_can_access_company helper from Phase 1
-- NOTE: Table names use correct Prisma mappings (data_room_activities, deal_activities)
-- NOTE: alerts table moved to Phase 3 (user-scoped, not company-scoped)

ALTER TABLE ebitda_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ebitda_adj_select" ON ebitda_adjustments
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "ebitda_adj_service_role" ON ebitda_adjustments
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE core_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "core_factors_select" ON core_factors
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "core_factors_service_role" ON core_factors
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_periods_select" ON financial_periods
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "fin_periods_service_role" ON financial_periods
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE income_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "income_stmt_select" ON income_statements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM financial_periods fp WHERE fp.id = income_statements.period_id AND public.user_can_access_company(fp.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "income_stmt_service_role" ON income_statements
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE balance_sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "balance_sheet_select" ON balance_sheets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM financial_periods fp WHERE fp.id = balance_sheets.period_id AND public.user_can_access_company(fp.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "balance_sheet_service_role" ON balance_sheets
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE cash_flow_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_flow_select" ON cash_flow_statements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM financial_periods fp WHERE fp.id = cash_flow_statements.period_id AND public.user_can_access_company(fp.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "cash_flow_service_role" ON cash_flow_statements
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE dcf_assumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dcf_select" ON dcf_assumptions
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "dcf_service_role" ON dcf_assumptions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE valuation_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "valuation_select" ON valuation_snapshots
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "valuation_service_role" ON valuation_snapshots
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessments_select" ON assessments
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "assessments_service_role" ON assessments
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assess_resp_select" ON assessment_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM assessments a WHERE a.id = assessment_responses.assessment_id AND public.user_can_access_company(a.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "assess_resp_service_role" ON assessment_responses
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE company_question_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "question_priority_select" ON company_question_priorities
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "question_priority_service_role" ON company_question_priorities
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE project_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proj_assess_select" ON project_assessments
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "proj_assess_service_role" ON project_assessments
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE project_assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proj_assess_q_select" ON project_assessment_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_assessments pa WHERE pa.id = project_assessment_questions.assessment_id AND public.user_can_access_company(pa.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "proj_assess_q_service_role" ON project_assessment_questions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE project_assessment_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "proj_assess_r_select" ON project_assessment_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM project_assessment_questions paq JOIN project_assessments pa ON pa.id = paq.assessment_id WHERE paq.id = project_assessment_responses.question_id AND public.user_can_access_company(pa.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "proj_assess_r_service_role" ON project_assessment_responses
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "tasks_service_role" ON tasks
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_assign_select" ON task_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_assignments.task_id AND public.user_can_access_company(t.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "task_assign_service_role" ON task_assignments
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE task_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_invite_select" ON task_invites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_invites.task_id AND public.user_can_access_company(t.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "task_invite_service_role" ON task_invites
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sprints_select" ON sprints
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "sprints_service_role" ON sprints
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_rooms_select" ON data_rooms
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "data_rooms_service_role" ON data_rooms
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_folders_select" ON data_room_folders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM data_rooms dr WHERE dr.id = data_room_folders.data_room_id AND public.user_can_access_company(dr.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "dr_folders_service_role" ON data_room_folders
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_docs_select" ON data_room_documents
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "dr_docs_service_role" ON data_room_documents
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_doc_ver_select" ON data_room_document_versions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM data_room_documents drd WHERE drd.id = data_room_document_versions.document_id AND public.user_can_access_company(drd.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "dr_doc_ver_service_role" ON data_room_document_versions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_tags_select" ON data_room_tags
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "dr_tags_service_role" ON data_room_tags
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_document_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_doc_tags_select" ON data_room_document_tags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM data_room_documents drd WHERE drd.id = data_room_document_tags.document_id AND public.user_can_access_company(drd.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "dr_doc_tags_service_role" ON data_room_document_tags
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_access_select" ON data_room_access
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM data_rooms dr WHERE dr.id = data_room_access.data_room_id AND public.user_can_access_company(dr.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "dr_access_service_role" ON data_room_access
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_activity_select" ON data_room_activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM data_rooms dr WHERE dr.id = data_room_activities.data_room_id AND public.user_can_access_company(dr.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "dr_activity_service_role" ON data_room_activities
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_document_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_doc_views_select" ON data_room_document_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM data_room_documents drd WHERE drd.id = data_room_document_views.document_id AND public.user_can_access_company(drd.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "dr_doc_views_service_role" ON data_room_document_views
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_questions_select" ON data_room_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM data_rooms dr WHERE dr.id = data_room_questions.data_room_id AND public.user_can_access_company(dr.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "dr_questions_service_role" ON data_room_questions
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_answers_select" ON data_room_answers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM data_room_questions drq JOIN data_rooms dr ON dr.id = drq.data_room_id WHERE drq.id = data_room_answers.question_id AND public.user_can_access_company(dr.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "dr_answers_service_role" ON data_room_answers
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE data_room_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dr_notif_select" ON data_room_notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM data_rooms dr WHERE dr.id = data_room_notifications.data_room_id AND public.user_can_access_company(dr.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "dr_notif_service_role" ON data_room_notifications
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_select" ON integrations
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "integrations_service_role" ON integrations
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "int_sync_logs_select" ON integration_sync_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM integrations i WHERE i.id = integration_sync_logs.integration_id AND public.user_can_access_company(i.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "int_sync_logs_service_role" ON integration_sync_logs
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE prospective_buyers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyers_select" ON prospective_buyers
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "buyers_service_role" ON prospective_buyers
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE buyer_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_contacts_select" ON buyer_contacts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM prospective_buyers pb WHERE pb.id = buyer_contacts.buyer_id AND public.user_can_access_company(pb.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "buyer_contacts_service_role" ON buyer_contacts
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE deal_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_stage_select" ON deal_stage_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM prospective_buyers pb WHERE pb.id = deal_stage_history.buyer_id AND public.user_can_access_company(pb.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "deal_stage_service_role" ON deal_stage_history
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_activity_select" ON deal_activities
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM prospective_buyers pb WHERE pb.id = deal_activities.buyer_id AND public.user_can_access_company(pb.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "deal_activity_service_role" ON deal_activities
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_docs_select" ON deal_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM prospective_buyers pb WHERE pb.id = deal_documents.buyer_id AND public.user_can_access_company(pb.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "deal_docs_service_role" ON deal_documents
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE deal_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_meetings_select" ON deal_meetings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM prospective_buyers pb WHERE pb.id = deal_meetings.buyer_id AND public.user_can_access_company(pb.company_id))
    OR public.is_super_admin()
  );
CREATE POLICY "deal_meetings_service_role" ON deal_meetings
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE buyer_prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buyer_prosp_select" ON buyer_prospects
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "buyer_prosp_service_role" ON buyer_prospects
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE prospect_import_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prosp_import_select" ON prospect_import_batches
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "prosp_import_service_role" ON prospect_import_batches
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access_req_select" ON access_requests
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "access_req_service_role" ON access_requests
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE company_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_invites_select" ON company_invites
  FOR SELECT USING (public.user_can_access_company(company_id) OR public.is_super_admin());
CREATE POLICY "company_invites_service_role" ON company_invites
  FOR ALL USING (auth.role() = 'service_role');
