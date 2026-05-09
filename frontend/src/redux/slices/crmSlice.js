import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { crmEndpoints } from "../../Services/apis";
import { apiConnector } from "../../Services/apiConnector";

const initialState = {
  leads: [],
  archivedLeads: [],
  historyLeads: [],
  accounts: [],
  contacts: [],
  deals: [],
  documents: [],
  loading: false,
  error: null,
  analytics: null,
  archivedDeals: [],
  allowedDealRoles: ['admin', 'manager', 'hr', 'sales', 'marketing'],
};

export const fetchLeads = createAsyncThunk(
// ... existing ...
  "crm/fetchLeads",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", crmEndpoints.GET_LEADS_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.leads;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchLeadHistory = createAsyncThunk(
  "crm/fetchLeadHistory",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiConnector("GET", crmEndpoints.GET_LEADS_HISTORY_API);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.leads;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const createLead = createAsyncThunk(
  "crm/createLead",
  async (leadData, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", crmEndpoints.CREATE_LEAD_API, leadData);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.lead;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateLead = createAsyncThunk(
  "crm/updateLead",
  async ({ leadId, data }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", crmEndpoints.UPDATE_LEAD_API(leadId), data);
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.lead;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const deleteLead = createAsyncThunk(
  "crm/deleteLead",
  async (leadId, { rejectWithValue }) => {
    try {
      const res = await apiConnector("DELETE", crmEndpoints.DELETE_LEAD_API(leadId));
      if (!res.data.success) return rejectWithValue(res.data.message);
      return leadId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const transferLead = createAsyncThunk(
  "crm/transferLead",
  async ({ leadId, deptId }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", crmEndpoints.TRANSFER_LEAD_API(leadId), { deptId });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return { leadId, deptId, message: res.data.message };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const updateLeadStatus = createAsyncThunk(
  "crm/updateLeadStatus",
  async ({ leadId, status }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", crmEndpoints.UPDATE_LEAD_STATUS_API(leadId), { status });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.lead;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const requestLeadApproval = createAsyncThunk(
  "crm/requestLeadApproval",
  async (leadId, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", crmEndpoints.REQUEST_LEAD_APPROVAL_API(leadId));
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.lead;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const approveLead = createAsyncThunk(
  "crm/approveLead",
  async ({ leadId, status, rejectionReason }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("POST", crmEndpoints.APPROVE_LEAD_API(leadId), { status, rejectionReason });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.lead;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const scheduleFollowUp = createAsyncThunk(
  "crm/scheduleFollowUp",
  async ({ leadId, nextFollowUpDate, followUpNote }, { rejectWithValue }) => {
    try {
      const res = await apiConnector("PUT", crmEndpoints.SCHEDULE_FOLLOWUP_API(leadId), { nextFollowUpDate, followUpNote });
      if (!res.data.success) return rejectWithValue(res.data.message);
      return res.data.lead;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

export const fetchAccounts = createAsyncThunk(
    "crm/fetchAccounts",
    async (_, { rejectWithValue }) => {
      try {
        const res = await apiConnector("GET", crmEndpoints.GET_ACCOUNTS_API);
        return res.data.accounts;
      } catch (err) { return rejectWithValue(err.message); }
    }
);

export const fetchContacts = createAsyncThunk(
    "crm/fetchContacts",
    async (_, { rejectWithValue }) => {
      try {
        const res = await apiConnector("GET", crmEndpoints.GET_CONTACTS_API);
        return res.data.contacts;
      } catch (err) { return rejectWithValue(err.message); }
    }
);

export const fetchDeals = createAsyncThunk(
    "crm/fetchDeals",
    async (_, { rejectWithValue }) => {
      try {
        const res = await apiConnector("GET", crmEndpoints.GET_DEALS_API);
        return res.data.deals;
      } catch (err) { return rejectWithValue(err.message); }
    }
);

export const convertLead = createAsyncThunk(
    "crm/convertLead",
    async ({ leadId, data }, { rejectWithValue }) => {
        try {
            const res = await apiConnector("POST", crmEndpoints.CONVERT_LEAD_API(leadId), data);
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data;
        } catch (err) { return rejectWithValue(err.message); }
    }
);

// --- LEAD LIFECYCLE: IMPORT, ARCHIVE, RESTORE ---

export const fetchArchivedLeads = createAsyncThunk(
    "crm/fetchArchived",
    async (_, { rejectWithValue }) => {
        try {
            const res = await apiConnector("GET", crmEndpoints.GET_ARCHIVED_LEADS_API);
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data.leads;
        } catch (err) { return rejectWithValue(err.message); }
    }
);

export const importLeads = createAsyncThunk(
    "crm/importLeads",
    async (leadsData, { rejectWithValue, dispatch }) => {
        try {
            const res = await apiConnector("POST", crmEndpoints.IMPORT_LEADS_API, { leads: leadsData });
            if (!res.data.success) return rejectWithValue(res.data.message);
            dispatch(fetchLeads()); // Refresh list
            return res.data;
        } catch (err) { return rejectWithValue(err.message); }
    }
);

export const moveToPipeline = createAsyncThunk(
    "crm/moveToPipeline",
    async (leadIds, { rejectWithValue }) => {
        try {
            const res = await apiConnector("PUT", crmEndpoints.MOVE_TO_PIPELINE_API, { leadIds });
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data.leads;
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message); }
    }
);

export const bulkDeleteLeads = createAsyncThunk(
    "crm/bulkDeleteLeads",
    async (leadIds, { rejectWithValue, dispatch }) => {
        try {
            const res = await apiConnector("POST", crmEndpoints.BULK_DELETE_LEADS_API, { leadIds });
            if (!res.data.success) return rejectWithValue(res.data.message);
            dispatch(fetchLeads());
            return res.data;
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message); }
    }
);

export const archiveLead = createAsyncThunk(
    "crm/archiveLead",
    async (leadId, { rejectWithValue }) => {
        try {
            const res = await apiConnector("PATCH", crmEndpoints.ARCHIVE_LEAD_API(leadId));
            if (!res.data.success) return rejectWithValue(res.data.message);
            return leadId;
        } catch (err) { return rejectWithValue(err.message); }
    }
);

export const restoreLead = createAsyncThunk(
    "crm/restoreLead",
    async (leadId, { rejectWithValue }) => {
        try {
            const res = await apiConnector("PATCH", crmEndpoints.RESTORE_LEAD_API(leadId));
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data.lead;
        } catch (err) { return rejectWithValue(err.message); }
    }
);

// --- ACCOUNTS CRUD ---
export const createAccount = createAsyncThunk("crm/createAccount", async (data, { rejectWithValue }) => {
    try { const res = await apiConnector("POST", crmEndpoints.CREATE_ACCOUNT_API, data); return res.data.account; } catch (err) { return rejectWithValue(err.message); }
});
export const updateAccount = createAsyncThunk("crm/updateAccount", async ({ id, data }, { rejectWithValue }) => {
    try { const res = await apiConnector("PUT", crmEndpoints.UPDATE_ACCOUNT_API(id), data); return res.data.account; } catch (err) { return rejectWithValue(err.message); }
});
export const deleteAccount = createAsyncThunk("crm/deleteAccount", async (id, { rejectWithValue }) => {
    try { await apiConnector("DELETE", crmEndpoints.DELETE_ACCOUNT_API(id)); return id; } catch (err) { return rejectWithValue(err.message); }
});

// --- CONTACTS CRUD ---
export const createContact = createAsyncThunk("crm/createContact", async (data, { rejectWithValue }) => {
    try { const res = await apiConnector("POST", crmEndpoints.CREATE_CONTACT_API, data); return res.data.contact; } catch (err) { return rejectWithValue(err.message); }
});
export const updateContact = createAsyncThunk("crm/updateContact", async ({ id, data }, { rejectWithValue }) => {
    try { const res = await apiConnector("PUT", crmEndpoints.UPDATE_CONTACT_API(id), data); return res.data.contact; } catch (err) { return rejectWithValue(err.message); }
});
export const deleteContact = createAsyncThunk("crm/deleteContact", async (id, { rejectWithValue }) => {
    try { await apiConnector("DELETE", crmEndpoints.DELETE_CONTACT_API(id)); return id; } catch (err) { return rejectWithValue(err.message); }
});

// --- DEALS CRUD ---
export const createDeal = createAsyncThunk("crm/createDeal", async (data, { rejectWithValue }) => {
    try { const res = await apiConnector("POST", crmEndpoints.CREATE_DEAL_API, data); return res.data.deal; } catch (err) { return rejectWithValue(err.message); }
});
export const updateDeal = createAsyncThunk("crm/updateDeal", async ({ id, data }, { rejectWithValue }) => {
    try { const res = await apiConnector("PUT", crmEndpoints.UPDATE_DEAL_API(id), data); return res.data.deal; } catch (err) { return rejectWithValue(err.message); }
});
export const deleteDeal = createAsyncThunk("crm/deleteDeal", async (id, { rejectWithValue }) => {
    try { await apiConnector("DELETE", crmEndpoints.DELETE_DEAL_API(id)); return id; } catch (err) { return rejectWithValue(err.message); }
});
export const updateDealStage = createAsyncThunk("crm/updateDealStage", async ({ id, stage }, { rejectWithValue }) => {
    try { const res = await apiConnector("PUT", crmEndpoints.UPDATE_DEAL_STAGE_API(id), { stage }); return res.data.deal; } catch (err) { return rejectWithValue(err.message); }
});
export const assignDeal = createAsyncThunk("crm/assignDeal", async ({ id, assignedTo }, { rejectWithValue }) => {
    try { const res = await apiConnector("PUT", crmEndpoints.ASSIGN_DEAL_API(id), { assignedTo }); return res.data.deal; } catch (err) { return rejectWithValue(err.message); }
});
export const addDealNote = createAsyncThunk("crm/addDealNote", async ({ id, text }, { rejectWithValue }) => {
    try { const res = await apiConnector("POST", crmEndpoints.ADD_DEAL_NOTE_API(id), { text }); return res.data.deal; } catch (err) { return rejectWithValue(err.message); }
});
export const uploadDealDocument = createAsyncThunk("crm/uploadDealDocument", async ({ id, formData }, { rejectWithValue }) => {
    try { 
        const res = await apiConnector("POST", crmEndpoints.UPLOAD_DEAL_DOCUMENT_API(id), formData, { "Content-Type": "multipart/form-data" }); 
        return res.data.deal; 
    } catch (err) { return rejectWithValue(err.message); }
});
export const setDealFollowUp = createAsyncThunk("crm/setDealFollowUp", async ({ id, date, note }, { rejectWithValue }) => {
    try { const res = await apiConnector("PUT", crmEndpoints.SET_DEAL_FOLLOWUP_API(id), { date, note }); return res.data.deal; } catch (err) { return rejectWithValue(err.message); }
});

export const getCRMAnalytics = createAsyncThunk("crm/getAnalytics", async (_, { rejectWithValue }) => {
    try { const res = await apiConnector("GET", crmEndpoints.GET_CRM_ANALYTICS_API); return res.data.analytics; } catch (err) { return rejectWithValue(err.message); }
});

export const fetchArchivedDeals = createAsyncThunk(
    "crm/fetchArchivedDeals",
    async (_, { rejectWithValue }) => {
        try {
            const res = await apiConnector("GET", crmEndpoints.GET_ARCHIVED_DEALS_API);
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data.deals;
        } catch (err) { return rejectWithValue(err.message); }
    }
);

export const restoreDeal = createAsyncThunk(
    "crm/restoreDeal",
    async (dealId, { rejectWithValue }) => {
        try {
            const res = await apiConnector("PATCH", crmEndpoints.RESTORE_DEAL_API(dealId));
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data.deal;
        } catch (err) { return rejectWithValue(err.message); }
    }
);

// --- DOCUMENTS CRUD ---
export const fetchDocuments = createAsyncThunk("crm/fetchDocuments", async (_, { rejectWithValue }) => {
    try { const res = await apiConnector("GET", crmEndpoints.GET_DOCUMENTS_API); return res.data.documents; } catch (err) { return rejectWithValue(err.message); }
});

export const createDocument = createAsyncThunk("crm/createDocument", async (formData, { rejectWithValue }) => {
    try {
        // FormData used for file upload
        const res = await apiConnector("POST", crmEndpoints.CREATE_DOCUMENT_API, formData, {
            "Content-Type": "multipart/form-data",
        });
        return res.data.document;
    } catch (err) { return rejectWithValue(err.message); }
});

export const deleteDocument = createAsyncThunk("crm/deleteDocument", async (id, { rejectWithValue }) => {
    try { await apiConnector("DELETE", crmEndpoints.DELETE_DOCUMENT_API(id)); return id; } catch (err) { return rejectWithValue(err.message); }
});

export const sendBulkEmail = createAsyncThunk("crm/sendBulkEmail", async (data, { rejectWithValue }) => {
    try {
        const res = await apiConnector("POST", crmEndpoints.SEND_CRM_EMAIL_API, data);
        if (!res.data.success) return rejectWithValue(res.data.message);
        return res.data;
    } catch (err) { return rejectWithValue(err.message); }
});

export const updateLeadChecklist = createAsyncThunk(
    "crm/updateChecklist",
    async ({ leadId, checklist }, { rejectWithValue }) => {
        try {
            const res = await apiConnector("PUT", crmEndpoints.UPDATE_LEAD_CHECKLIST_API(leadId), { checklist });
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data.lead;
        } catch (err) { return rejectWithValue(err.message); }
    }
);
export const initiateCall = createAsyncThunk(
    "crm/initiateCall",
    async (leadId, { rejectWithValue }) => {
        try {
            const res = await apiConnector("POST", crmEndpoints.INITIATE_CALL_API(leadId));
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data;
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message); }
    }
);
export const updateQuickRemark = createAsyncThunk(
    "crm/updateRemark",
    async ({ leadId, remark }, { rejectWithValue }) => {
        try {
            const res = await apiConnector("PATCH", crmEndpoints.UPDATE_REMARK_API(leadId), { remark });
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data.lead;
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message); }
    }
);

export const getCRMConfig = createAsyncThunk(
    "crm/getConfig",
    async (_, { rejectWithValue }) => {
        try {
            const res = await apiConnector("GET", crmEndpoints.GET_CRM_CONFIG_API);
            if (!res.data.success) return rejectWithValue(res.data.message);
            return res.data.config;
        } catch (err) { return rejectWithValue(err.response?.data?.message || err.message); }
    }
);

const crmSlice = createSlice({
  name: "crm",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeads.pending, (state) => { state.loading = true; })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading = false;
        state.leads = action.payload;
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createLead.fulfilled, (state, action) => {
        const exists = state.leads.some(l => l._id === action.payload._id);
        if (!exists) state.leads.unshift(action.payload);
      })
      .addCase(updateLead.fulfilled, (state, action) => {
        const i = state.leads.findIndex(l => l._id === action.payload._id);
        if (i !== -1) state.leads[i] = action.payload;
      })
      .addCase(deleteLead.fulfilled, (state, action) => {
        state.leads = state.leads.filter(l => l._id !== action.payload);
      })
      .addCase(transferLead.fulfilled, (state, action) => {
        state.leads = state.leads.filter(l => l._id !== action.payload.leadId);
      })
      .addCase(updateLeadStatus.fulfilled, (state, action) => {
        const i = state.leads.findIndex(l => l._id === action.payload._id);
        if (i !== -1) state.leads[i] = action.payload;
      })
      .addCase(requestLeadApproval.fulfilled, (state, action) => {
        const i = state.leads.findIndex(l => l._id === action.payload._id);
        if (i !== -1) state.leads[i] = action.payload;
      })
      .addCase(approveLead.fulfilled, (state, action) => {
        const i = state.leads.findIndex(l => l._id === action.payload._id);
        if (i !== -1) state.leads[i] = action.payload;
      })
      .addCase(scheduleFollowUp.fulfilled, (state, action) => {
        const i = state.leads.findIndex(l => l._id === action.payload._id);
        if (i !== -1) state.leads[i] = action.payload;
      })
      .addCase(fetchLeadHistory.fulfilled, (state, action) => {
        state.historyLeads = action.payload;
      })
      .addCase(fetchAccounts.pending, (state) => { state.loading = true; })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
          state.loading = false;
          state.accounts = action.payload;
      })
      .addCase(fetchAccounts.rejected, (state) => { state.loading = false; })

      .addCase(fetchContacts.pending, (state) => { state.loading = true; })
      .addCase(fetchContacts.fulfilled, (state, action) => {
          state.loading = false;
          state.contacts = action.payload;
      })
      .addCase(fetchContacts.rejected, (state) => { state.loading = false; })

      .addCase(fetchDeals.pending, (state) => { state.loading = true; })
      .addCase(fetchDeals.fulfilled, (state, action) => {
          state.loading = false;
          state.deals = action.payload;
      })
      .addCase(fetchDeals.rejected, (state) => { state.loading = false; })

      .addCase(convertLead.fulfilled, (state, action) => {
          // The backend returns { account, contact, deal }. We need the leadId from the request args.
          const leadId = action.meta.arg.leadId;
          state.leads = state.leads.filter(l => l._id !== leadId);
          state.accounts.unshift(action.payload.account);
          state.contacts.unshift(action.payload.contact);
          state.deals.unshift(action.payload.deal);
      })
      .addCase(updateLeadChecklist.fulfilled, (state, action) => {
          const i = state.leads.findIndex(l => l._id === action.payload._id);
          if (i !== -1) state.leads[i] = action.payload;
      })
      // Account Reducers
      .addCase(createAccount.fulfilled, (state, action) => { state.accounts.unshift(action.payload); })
      .addCase(updateAccount.fulfilled, (state, action) => {
          const i = state.accounts.findIndex(a => a._id === action.payload._id);
          if (i !== -1) state.accounts[i] = action.payload;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
          state.accounts = state.accounts.filter(a => a._id !== action.payload);
      })
      // Contact Reducers
      .addCase(createContact.fulfilled, (state, action) => { state.contacts.unshift(action.payload); })
      .addCase(updateContact.fulfilled, (state, action) => {
          const i = state.contacts.findIndex(c => c._id === action.payload._id);
          if (i !== -1) state.contacts[i] = action.payload;
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
          state.contacts = state.contacts.filter(c => c._id !== action.payload);
      })
      // Deal Reducers
      .addCase(createDeal.fulfilled, (state, action) => { state.deals.unshift(action.payload); })
      .addCase(updateDeal.fulfilled, (state, action) => {
          const i = state.deals.findIndex(d => d._id === action.payload._id);
          if (i !== -1) state.deals[i] = action.payload;
      })
      .addCase(deleteDeal.fulfilled, (state, action) => {
          state.deals = state.deals.filter(d => d._id !== action.payload);
      })
      .addCase(updateDealStage.fulfilled, (state, action) => {
          const i = state.deals.findIndex(d => d._id === action.payload._id);
          if (i !== -1) state.deals[i] = action.payload;
      })
      .addCase(assignDeal.fulfilled, (state, action) => {
          const i = state.deals.findIndex(d => d._id === action.payload._id);
          if (i !== -1) state.deals[i] = action.payload;
      })
      .addCase(addDealNote.fulfilled, (state, action) => {
          const i = state.deals.findIndex(d => d._id === action.payload._id);
          if (i !== -1) state.deals[i] = action.payload;
      })
      .addCase(uploadDealDocument.fulfilled, (state, action) => {
          const i = state.deals.findIndex(d => d._id === action.payload._id);
          if (i !== -1) state.deals[i] = action.payload;
      })
      .addCase(setDealFollowUp.fulfilled, (state, action) => {
          const i = state.deals.findIndex(d => d._id === action.payload._id);
          if (i !== -1) state.deals[i] = action.payload;
      })
      // Analytics Reducer
      .addCase(getCRMAnalytics.fulfilled, (state, action) => {
          state.analytics = action.payload;
      })
      // Document Reducers
      .addCase(fetchDocuments.pending, (state) => { state.loading = true; })
      .addCase(fetchDocuments.fulfilled, (state, action) => { 
          state.loading = false;
          state.documents = action.payload; 
      })
      .addCase(fetchDocuments.rejected, (state) => { state.loading = false; })

      .addCase(createDocument.fulfilled, (state, action) => { state.documents.unshift(action.payload); })
      .addCase(deleteDocument.fulfilled, (state, action) => {
          state.documents = state.documents.filter(d => d._id !== action.payload);
      })
      // --- Lead Lifecycle Reducers ---
      .addCase(fetchArchivedLeads.fulfilled, (state, action) => {
          state.archivedLeads = action.payload;
      })
      .addCase(archiveLead.fulfilled, (state, action) => {
          state.leads = state.leads.filter(l => l._id !== action.payload);
      })
      .addCase(moveToPipeline.fulfilled, (state, action) => {
          const updatedLeads = action.payload;
          updatedLeads.forEach(updatedLead => {
              const i = state.leads.findIndex(l => l._id === updatedLead._id);
              if (i !== -1) state.leads[i] = updatedLead;
          });
      })
      .addCase(restoreLead.fulfilled, (state, action) => {
          state.archivedLeads = state.archivedLeads.filter(l => l._id !== action.payload._id);
          state.leads.unshift(action.payload);
      })
      .addCase(fetchArchivedDeals.fulfilled, (state, action) => {
          state.archivedDeals = action.payload;
      })
      .addCase(restoreDeal.fulfilled, (state, action) => {
          state.archivedDeals = state.archivedDeals.filter(d => d._id !== action.payload._id);
          state.deals.unshift(action.payload);
      })
      .addCase(updateQuickRemark.fulfilled, (state, action) => {
          const i = state.leads.findIndex(l => l._id === action.payload._id);
          if (i !== -1) state.leads[i] = action.payload;
      })
      .addCase(getCRMConfig.fulfilled, (state, action) => {
          if (action.payload.allowedDealRoles) {
              state.allowedDealRoles = action.payload.allowedDealRoles;
          }
      });
  },
});


export default crmSlice.reducer;
