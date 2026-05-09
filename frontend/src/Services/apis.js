// Automatically detect if running locally or on live server
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export const BACKEND_URL = isLocalhost 
  ? "http://localhost:5000" 
  : "https://taskmanagerapp-backend-kv8n.onrender.com";

export const BASE_URL = `${BACKEND_URL}/api`;

export const authEndpoints = {
  REGISTER_API: `${BASE_URL}/auth/register`,
  LOGIN_API: `${BASE_URL}/auth/login`,
  GET_ME_API: `${BASE_URL}/auth/me`,
  SELECT_PLAN_API: `${BASE_URL}/auth/select-plan`,
  GET_PUBLIC_PLANS: `${BASE_URL}/auth/plans`,
  INVITE_EMPLOYEE_API: `${BASE_URL}/auth/invite-employee`,
  SET_PASSWORD_API: `${BASE_URL}/auth/set-password`,
  LOGOUT_API: `${BASE_URL}/auth/logout`,
  FORGOT_PASSWORD_API: `${BASE_URL}/auth/forgot-password`,
  RESET_PASSWORD_API: (token) => `${BASE_URL}/auth/reset-password/${token}`,
  GET_USER_ACTIVITY_API: `${BASE_URL}/auth/user-activity`,
};

export const superAdminEndpoints = {
  CREATE_PLAN_API: `${BASE_URL}/superadmin/plans`,
  GET_PLANS_API: `${BASE_URL}/superadmin/plans`,
  UPDATE_PLAN_API: (id) => `${BASE_URL}/superadmin/plans/${id}`,
  DELETE_PLAN_API: (id) => `${BASE_URL}/superadmin/plans/${id}`,
  GET_ALL_COMPANIES_API: `${BASE_URL}/superadmin/companies`,
  TOGGLE_COMPANY_STATUS_API: (id) => `${BASE_URL}/superadmin/companies/${id}/toggle-status`,
  GET_STATS_API: `${BASE_URL}/superadmin/stats`,
};

export const departmentEndpoints = {
  GET_DEPARTMENTS_API: `${BASE_URL}/departments`,
  CREATE_DEPARTMENT_API: `${BASE_URL}/departments`,
  UPDATE_DEPARTMENT_API: (id) => `${BASE_URL}/departments/${id}`,
  DELETE_DEPARTMENT_API: (id) => `${BASE_URL}/departments/${id}`,
  UPDATE_CRM_SETTINGS_API: `${BASE_URL}/departments/crm-settings`,
};

export const employeeEndpoints = {
  GET_ALL_EMPLOYEES_API: `${BASE_URL}/employees`,
  CHANGE_ROLE_API: (id) => `${BASE_URL}/employees/${id}/role`,
  TOGGLE_STATUS_API: (id) => `${BASE_URL}/employees/${id}/toggle-status`,
  UPDATE_PROFILE_API: `${BASE_URL}/employees/profile`,
  CHANGE_PASSWORD_API: `${BASE_URL}/employees/change-password`,
};

export const taskEndpoints = {
  CREATE_TASK_API: `${BASE_URL}/tasks`,
  GET_TASKS_API: `${BASE_URL}/tasks`,
  UPDATE_TASK_STATUS_API: (id) => `${BASE_URL}/tasks/${id}/status`,
  ADD_COMMENT_API: (id) => `${BASE_URL}/tasks/${id}/comments`,
  UPDATE_SUBTASK_API: (id, subTaskId) => `${BASE_URL}/tasks/${id}/subtasks/${subTaskId}`,
  TRANSFER_TASK_API: (id) => `${BASE_URL}/tasks/${id}/transfer-dept`,
  APPROVE_TASK_STATE_API: (id) => `${BASE_URL}/tasks/${id}/approve-state`,
  REASSIGN_TASK_API: (id) => `${BASE_URL}/tasks/reassign/${id}`,
  ACCEPT_TASK_API: (id) => `${BASE_URL}/tasks/${id}/accept`,
  REJECT_TASK_API: (id) => `${BASE_URL}/tasks/${id}/reject`,
  GET_ARCHIVED_TASKS_API: `${BASE_URL}/tasks/archived`,
  RESTORE_TASK_API: (id) => `${BASE_URL}/tasks/${id}/restore`,
  DELETE_TASK_API: (id) => `${BASE_URL}/tasks/${id}`,
  ADD_TASK_ATTACHMENTS_API: (id) => `${BASE_URL}/tasks/${id}/attachments`,
};

export const crmEndpoints = {
  CREATE_LEAD_API: `${BASE_URL}/crm/leads`,
  GET_LEADS_API: `${BASE_URL}/crm/leads`,
  GET_LEADS_HISTORY_API: `${BASE_URL}/crm/leads/history`,
  UPDATE_LEAD_API: (id) => `${BASE_URL}/crm/leads/${id}`,
  DELETE_LEAD_API: (id) => `${BASE_URL}/crm/leads/${id}`,
  UPDATE_LEAD_STATUS_API: (id) => `${BASE_URL}/crm/${id}/status`,
  TRANSFER_LEAD_API: (id) => `${BASE_URL}/crm/${id}/transfer`,
  REQUEST_LEAD_APPROVAL_API: (id) => `${BASE_URL}/crm/leads/${id}/request-approval`,
  APPROVE_LEAD_API: (id) => `${BASE_URL}/crm/leads/${id}/approve`,
  SCHEDULE_FOLLOWUP_API: (id) => `${BASE_URL}/crm/${id}/followup`,
  CONVERT_LEAD_API: (id) => `${BASE_URL}/crm/leads/${id}/convert`,
  UPDATE_LEAD_CHECKLIST_API: (id) => `${BASE_URL}/crm/leads/${id}/checklist`,
  IMPORT_LEADS_API: `${BASE_URL}/crm/leads/import`,
  BULK_DELETE_LEADS_API: `${BASE_URL}/crm/leads/bulk-delete`,
  MOVE_TO_PIPELINE_API: `${BASE_URL}/crm/leads/move-to-pipeline`,
  ARCHIVE_LEAD_API: (id) => `${BASE_URL}/crm/leads/${id}/archive`,
  RESTORE_LEAD_API: (id) => `${BASE_URL}/crm/leads/${id}/restore`,
  GET_ARCHIVED_LEADS_API: `${BASE_URL}/crm/leads/archived`,

  SEND_CRM_EMAIL_API: `${BASE_URL}/crm/send-email`,

  // ACCOUNTS
  GET_ACCOUNTS_API: `${BASE_URL}/crm/accounts`,
  CREATE_ACCOUNT_API: `${BASE_URL}/crm/accounts`,
  UPDATE_ACCOUNT_API: (id) => `${BASE_URL}/crm/accounts/${id}`,
  DELETE_ACCOUNT_API: (id) => `${BASE_URL}/crm/accounts/${id}`,

  // CONTACTS
  GET_CONTACTS_API: `${BASE_URL}/crm/contacts`,
  CREATE_CONTACT_API: `${BASE_URL}/crm/contacts`,
  UPDATE_CONTACT_API: (id) => `${BASE_URL}/crm/contacts/${id}`,
  DELETE_CONTACT_API: (id) => `${BASE_URL}/crm/contacts/${id}`,

  // DEALS
  GET_DEALS_API: `${BASE_URL}/crm/deals`,
  CREATE_DEAL_API: `${BASE_URL}/crm/deals`,
  UPDATE_DEAL_API: (id) => `${BASE_URL}/crm/deals/${id}`,
  DELETE_DEAL_API: (id) => `${BASE_URL}/crm/deals/${id}`,
  UPDATE_DEAL_STAGE_API: (id) => `${BASE_URL}/crm/deals/${id}/stage`,
  ASSIGN_DEAL_API: (id) => `${BASE_URL}/crm/deals/${id}/assign`,
  ADD_DEAL_NOTE_API: (id) => `${BASE_URL}/crm/deals/${id}/notes`,
  UPLOAD_DEAL_DOCUMENT_API: (id) => `${BASE_URL}/crm/deals/${id}/documents`,
  SET_DEAL_FOLLOWUP_API: (id) => `${BASE_URL}/crm/deals/${id}/followup`,
  GET_CRM_ANALYTICS_API: `${BASE_URL}/crm/analytics`,
  GET_ARCHIVED_DEALS_API: `${BASE_URL}/crm/deals/archived`,
  RESTORE_DEAL_API: (id) => `${BASE_URL}/crm/deals/${id}/restore`,

  // DOCUMENTS
  GET_DOCUMENTS_API: `${BASE_URL}/crm/documents`,
  CREATE_DOCUMENT_API: `${BASE_URL}/crm/documents`,
  DELETE_DOCUMENT_API: (id) => `${BASE_URL}/crm/documents/${id}`,
  INITIATE_CALL_API: (id) => `${BASE_URL}/crm/leads/${id}/call`,
  UPDATE_REMARK_API: (id) => `${BASE_URL}/crm/leads/${id}/remark`,
  GET_CALL_HISTORY_API: `${BASE_URL}/crm/call-history`,
  GET_TWILIO_TOKEN_API: `${BASE_URL}/crm/voice/token`,
  SUBMIT_POST_CALL_API: (id) => `${BASE_URL}/crm/leads/${id}/post-call`,
  GET_CRM_CONFIG_API: `${BASE_URL}/crm/config`,
};


export const chatEndpoints = {
  GET_CHANNELS_API: `${BASE_URL}/chat/channels`,
  CREATE_DM_API: `${BASE_URL}/chat/direct`,
  GET_MESSAGES_API: (channelId) => `${BASE_URL}/chat/messages/${channelId}`,
  SEND_MESSAGE_REST_API: `${BASE_URL}/chat/send`,
  MARK_AS_READ_API: (channelId) => `${BASE_URL}/chat/mark-read/${channelId}`,
  UPLOAD_ATTACHMENT_API: `${BASE_URL}/chat/upload`,
  BROADCAST_MESSAGE_API: `${BASE_URL}/chat/broadcast`,
  REACT_MESSAGE_API: (messageId) => `${BASE_URL}/chat/react/${messageId}`,
  INVITE_MEMBER_API: (channelId) => `${BASE_URL}/chat/invite/${channelId}`,
};

export const reportEndpoints = {
  GET_DASHBOARD_STATS_API: `${BASE_URL}/reports/dashboard`,
  SUBMIT_DAILY_REPORT_API: `${BASE_URL}/reports/daily`,
  GET_DAILY_REPORTS_API: `${BASE_URL}/reports/daily`,
  UPDATE_DAILY_REPORT_API: (id) => `${BASE_URL}/reports/daily/${id}`,
  DELETE_DAILY_REPORT_API: (id) => `${BASE_URL}/reports/daily/${id}`,
  REACT_DAILY_REPORT_API: (id) => `${BASE_URL}/reports/react/${id}`,
  EXPORT_DAILY_REPORTS_API: `${BASE_URL}/reports/daily/export`,
};

export const leaveEndpoints = {
  APPLY_LEAVE_API: `${BASE_URL}/leaves/apply`,
  GET_LEAVES_API: `${BASE_URL}/leaves`,
  GET_PENDING_LEAVES_API: `${BASE_URL}/leaves/pending`,
  PROCESS_LEAVE_API: (id) => `${BASE_URL}/leaves/${id}/process`,
};

export const attendanceEndpoints = {
  CHECK_IN_API: `${BASE_URL}/attendance/check-in`,
  CHECK_OUT_API: `${BASE_URL}/attendance/check-out`,
  GET_ATTENDANCE_API: `${BASE_URL}/attendance`,
  UPDATE_STATUS_API: (id) => `${BASE_URL}/attendance/${id}/status`,
  GET_SALARY_REPORT_API: `${BASE_URL}/attendance/salary-report`,
  MANUAL_UPDATE_API: `${BASE_URL}/attendance/manual`,
};

export const companyEndpoints = {
  GET_COMPANY_API: `${BASE_URL}/company`,
  UPDATE_COMPANY_API: `${BASE_URL}/company`,
  UPDATE_LOCATION_API: `${BASE_URL}/company/location`,
};

export const notificationEndpoints = {
  GET_NOTIFICATIONS_API: `${BASE_URL}/notifications`,
  MARK_READ_API: (id) => `${BASE_URL}/notifications/${id}`,
};

export const projectEndpoints = {
  CREATE_PROJECT_API: `${BASE_URL}/projects`,
  GET_PROJECTS_API: `${BASE_URL}/projects`,
  GET_PROJECT_DETAILS_API: (id) => `${BASE_URL}/projects/${id}`,
};

export const billingEndpoints = {
  GET_INVOICES_API: `${BASE_URL}/billing/invoices`,
  CREATE_INVOICE_API: `${BASE_URL}/billing/invoices`,
  GET_INVOICE_BY_ID_API: (id) => `${BASE_URL}/billing/invoices/${id}`,
  ADD_PAYMENT_API: `${BASE_URL}/billing/payments`,
  GET_BILLING_STATS_API: `${BASE_URL}/billing/stats`,
};

export const subscriptionEndpoints = {
  CREATE_ORDER_API: `${BASE_URL}/subscriptions/create-order`,
  VERIFY_PAYMENT_API: `${BASE_URL}/subscriptions/verify-payment`,
  ACTIVATE_FREE_API: `${BASE_URL}/subscriptions/activate-free`,
  GET_STATUS_API: (companyId) => `${BASE_URL}/subscriptions/status/${companyId}`,
};

export const livekitEndpoints = {
  GET_TOKEN_API: `${BASE_URL}/livekit/token`,
};

