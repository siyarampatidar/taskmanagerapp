import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Plus, Search, Phone, Mail, Building2, TrendingUp, Clock,
  CheckCircle2, XCircle, ArrowRightLeft, Trash2, Pencil,
  ChevronDown, Filter, LayoutGrid, List, Activity, User,
  AlertCircle, Star, Calendar, FileDown, Archive, RotateCcw,
  Briefcase, Settings as SettingsIcon, Inbox as InboxIcon, PhoneCall,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchLeads, createLead, updateLead, deleteLead,
  fetchLeadHistory, updateLeadStatus, scheduleFollowUp,
  initiateCall, updateQuickRemark,
  fetchAccounts, fetchContacts, fetchDeals, convertLead, fetchDocuments,
  importLeads, archiveLead, restoreLead, fetchArchivedLeads, moveToPipeline,
  bulkDeleteLeads
} from '../redux/slices/crmSlice';
import { getTwilioToken, setCurrentCall } from '../redux/slices/twilioSlice';
import { makeCall } from '../Services/twilioVoiceService';
import { fetchDepartments, fetchEmployees } from '../redux/slices/hrSlice';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../components/common/ConfirmModal';
import EmailSlideOver from '../components/crm/EmailSlideOver';
import LeadDetailModal from '../components/crm/LeadDetailModal';
import { CRMSkeleton } from '../components/common/Skeleton';
import CallHistoryTab from './crm/CallHistoryTab';

// New Modular Components
import LeadChecklist from '../components/crm/LeadChecklist';
import DealsKanban from '../components/crm/DealsKanban';
import CrmDashboard from '../components/crm/CrmDashboard';
import ContactsTable from '../components/crm/ContactsTable';
import AccountsTable from '../components/crm/AccountsTable';
import DocumentsTable from '../components/crm/DocumentsTable';
import Inbox from '../components/crm/Inbox';
import EmailSettings from '../components/crm/EmailSettings';

const STAGES = ['new', 'contacted', 'qualified', 'converted', 'lost'];

const STAGE_CONFIG = {
  new: { label: 'New Lead', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400' },
  contacted: { label: 'Contacted', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  qualified: { label: 'Qualified', color: 'text-violet-600', bg: 'bg-violet-50', dot: 'bg-violet-500' },
  converted: { label: 'Won ✅', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' },
  lost: { label: 'Lost ❌', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-400' },
};

const PRIORITY_CONFIG = {
  high: { label: 'High', cls: 'bg-red-50 text-red-600 border border-red-100' },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-600 border border-amber-100' },
  low: { label: 'Low', cls: 'bg-green-50 text-green-600 border border-green-100' },
};

const SOURCE_OPTIONS = ['manual', 'website', 'referral', 'cold-call', 'campaign', 'social-media', 'facebook', 'instagram', 'linkedin', 'google', 'email', 'walk-in', 'other'];
const EMPTY_FORM = {
  name: '', email: '', contact: '', company: '', source: 'manual', dealValue: '', priority: 'medium', assignedTo: '',
  title: '', industry: '', gstNumber: '', website: '', annualRevenue: '', budgetRange: '', notes: ''
};

export default function CRM() {
  const dispatch = useDispatch();
  const { leads, archivedLeads, historyLeads, loading } = useSelector(s => s.crm);
  const { token: twilioToken } = useSelector(s => s.twilio);
  const { employees } = useSelector(s => s.hr);
  const { user } = useAuth();

  const [viewArchived, setViewArchived] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null); // New: Store parsed Excel data
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showRegressionModal, setShowRegressionModal] = useState(false);
  const [regressionData, setRegressionData] = useState({ leadId: '', fromStatus: '', toStatus: '', reason: '' });
  const [followUpLead, setFollowUpLead] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [transferDept, setTransferDept] = useState('');
  const [followUpForm, setFollowUpForm] = useState({ date: '', time: '', note: '' });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [searchQ, setSearchQ] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showEmailSlider, setShowEmailSlider] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertForm, setConvertForm] = useState({ dealName: '', amount: '', closingDate: '', accountName: '' });
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'table'
  const [callingLeadId, setCallingLeadId] = useState(null);
  const [remarkUpdating, setRemarkUpdating] = useState(null);
  const [editingCell, setEditingCell] = useState(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Pagination State for each column
  const [columnLimits, setColumnLimits] = useState(
    STAGES.reduce((acc, stage) => ({ ...acc, [stage]: 20 }), {})
  );

  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'leads');

  const TABS = [
    ...(['admin', 'manager', 'hr'].includes(user?.role?.toLowerCase()) ? [{ id: 'dashboard', label: 'Dashboard', icon: Activity }] : []),
    { id: 'leads', label: 'Leads', icon: TrendingUp },
    { id: 'call-center', label: 'Call Center', icon: PhoneCall },
    { id: 'accounts', label: 'Accounts', icon: Building2 },
    { id: 'contacts', label: 'Contacts', icon: User },
    { id: 'deals', label: 'Deals', icon: Briefcase },
    { id: 'inbox', label: 'Inbox', icon: InboxIcon },
    { id: 'documents', label: 'Documents', icon: LayoutGrid },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  useEffect(() => {
    if (tabFromUrl && ['leads', 'contacts', 'accounts', 'deals', 'documents', 'settings', 'inbox'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/dashboard/crm?tab=${tab}`, { replace: true });
  };

  useEffect(() => {
    dispatch(fetchLeads());
    dispatch(fetchDepartments());
    dispatch(fetchEmployees());
    dispatch(fetchAccounts());
    dispatch(fetchContacts());
    dispatch(fetchDeals());
    dispatch(fetchDocuments());
  }, [dispatch]);

  useEffect(() => {
    if (showHistoryModal) dispatch(fetchLeadHistory());
  }, [dispatch, showHistoryModal]);

  useEffect(() => {
    if (selectedLead) {
      const updated = leads.find(l => l._id === selectedLead._id);
      if (updated) setSelectedLead(updated);
    }
  }, [leads]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const payload = { ...form };
    if (!payload.assignedTo) delete payload.assignedTo;
    const result = await dispatch(createLead(payload));
    setActionLoading(false);
    if (createLead.fulfilled.match(result)) {
      toast.success('Lead created!');
      setShowAddModal(false);
      setForm(EMPTY_FORM);
    } else toast.error(result.payload || 'Failed to create');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const payload = { ...editForm };
    if (!payload.assignedTo) delete payload.assignedTo;
    const result = await dispatch(updateLead({ leadId: selectedLead._id, data: payload }));
    setActionLoading(false);
    if (updateLead.fulfilled.match(result)) {
      toast.success('Lead updated!');
      setShowEditModal(false);
    } else toast.error(result.payload || 'Failed to update');
  };

  const handleDelete = async () => {
    if (!selectedLead) return;
    setActionLoading(true);
    const result = await dispatch(deleteLead(selectedLead._id));
    setActionLoading(false);
    if (deleteLead.fulfilled.match(result)) {
      toast.success('Lead deleted');
      setShowDeleteModal(false);
      setSelectedLead(null);
    } else toast.error(result.payload || 'Failed to delete');
  };

  const handleArchive = async () => {
    if (!selectedLead) return;
    setActionLoading(true);
    const result = await dispatch(archiveLead(selectedLead._id));
    setActionLoading(false);
    if (archiveLead.fulfilled.match(result)) {
      toast.success('Lead Archived');
      setShowArchiveModal(false);
      setSelectedLead(null);
    } else toast.error(result.payload || 'Failed to archive');
  };

  const handleRestore = async (id) => {
    const result = await dispatch(restoreLead(id));
    if (restoreLead.fulfilled.match(result)) {
      toast.success('Lead Restored');
    } else toast.error(result.payload || 'Failed to restore');
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        Name: 'John Doe',
        Contact: '9876543210',
        Email: 'john@example.com',
        Company: 'Example Corp',
        Source: 'manual',
        Priority: 'high',
        'Deal Value': 5000
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Lead_Import_Template.xlsx");
  };

  const handleExportExcel = () => {
    // Export Data formatting
    const exportData = filtered.map(lead => {
      const base = {
        Name: lead.name || '---',
        Contact: lead.contact || '---',
        Email: lead.email || '---',
        Company: lead.company || '---',
        Status: lead.status ? lead.status.toUpperCase() : 'NEW',
        Source: lead.source || '---',
        Priority: lead.priority || 'medium',
        'Deal Value': lead.dealValue || 0,
        'Created At': new Date(lead.createdAt).toLocaleDateString(),
        'Last Followup': lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : '---',
        Remarks: lead.notes || lead.quickRemark || '---'
      };

      // Merge customFields back into the export row
      if (lead.customFields) {
        Object.keys(lead.customFields).forEach(key => {
          // Don't overwrite standard fields if they somehow conflict
          if (base[key] === undefined) {
            base[key] = lead.customFields[key];
          } else {
            base[`Extra_${key}`] = lead.customFields[key];
          }
        });
      }
      return base;
    });

    if (exportData.length === 0) return toast.error("No leads available to export.");

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads Data");
    XLSX.writeFile(wb, `TeamFlow_Leads_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
    toast.success("Excel sheet downloaded!");
  };

  const handleImportPreview = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      const validatedData = json.map((row, idx) => validateRow(row, idx));
      setImportPreview(validatedData);

      const errorCount = validatedData.filter(r => !r.isValid).length;
      if (errorCount > 0) {
        toast.error(`Found ${errorCount} leads with missing information. Double click cells to fix them.`, { duration: 5000 });
      } else {
        toast.success(`Excel parsed successfully! Found ${validatedData.length} valid leads.`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validateRow = (row, idx) => {
    const fieldMapping = {
      name: ['name', 'full name', 'lead name', 'client name', 'customer', 'customer name', 'lead'],
      contact: ['contact', 'phone', 'mobile', 'cell', 'number', 'phone number', 'contact number', 'mobile number'],
      email: ['email', 'email id', 'email address'],
    };

    let name = null, contact = null, email = null;
    Object.keys(row).forEach(header => {
      const h = header.toLowerCase().trim();
      if (fieldMapping.name.includes(h)) name = row[header];
      if (fieldMapping.contact.includes(h)) contact = row[header];
      if (fieldMapping.email.includes(h)) email = row[header];
    });

    let error = null;
    if (!name && !contact && !email) error = `Row ${idx + 1}: Needs Name, Contact or Email`;

    return {
      ...row,
      Name: name || 'Unknown Lead',
      Contact: contact || email || 'No Contact',
      isValid: !error,
      error: error
    };
  };

  const handleCellEdit = (rowIndex, header, newValue) => {
    const updatedPreview = [...importPreview];
    const updatedRow = { ...updatedPreview[rowIndex], [header]: newValue };
    updatedPreview[rowIndex] = validateRow(updatedRow, rowIndex);
    setImportPreview(updatedPreview);
    setEditingCell(null);
  };

  const handleLeadCellEdit = async (leadId, field, value) => {
    const lead = (viewArchived ? archivedLeads : leads).find(l => l._id === leadId);
    if (!lead) return;

    const standardFields = [
      'name', 'email', 'contact', 'company', 'source', 'dealValue', 'priority', 
      'title', 'industry', 'gstNumber', 'website', 'annualRevenue', 'budgetRange', 'notes'
    ];

    let updatePayload = {};
    if (standardFields.includes(field)) {
      updatePayload[field] = value;
    } else {
      updatePayload.customFields = { ...(lead.customFields || {}), [field]: value };
    }

    const result = await dispatch(updateLead({ leadId, data: updatePayload }));
    if (updateLead.fulfilled.match(result)) {
      toast.success('Lead updated');
    } else {
      toast.error(result.payload || 'Update failed');
    }
    setEditingCell(null);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importPreview) return toast.error('Please upload and preview leads first');

    // Check if there are any invalid rows
    if (importPreview.some(row => !row.isValid)) {
      return toast.error('Please fix errors in the preview before importing');
    }

    setActionLoading(true);
    const result = await dispatch(importLeads(importPreview));
    setActionLoading(false);

    if (importLeads.fulfilled.match(result)) {
      toast.success(result.payload?.message || 'Leads imported successfully!');
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
    } else toast.error(result.payload || 'Import failed');
  };

  const handleStageChange = async (leadId, status) => {
    const lead = leads.find(l => l._id === leadId);
    if (!lead) return;

    const stages = ['new', 'contacted', 'qualified', 'converted'];
    const fromIdx = stages.indexOf(lead.status === 'lost' ? 'qualified' : lead.status);
    const toIdx = stages.indexOf(status);

    if (toIdx !== -1 && fromIdx !== -1 && toIdx < fromIdx) {
      setRegressionData({ leadId, fromStatus: lead.status, toStatus: status, reason: '' });
      setShowRegressionModal(true);
      return;
    }

    const result = await dispatch(updateLeadStatus({ leadId, status }));
    if (updateLeadStatus.fulfilled.match(result)) {
      toast.success(`Moved to ${STAGE_CONFIG[status].label}`);
      if (selectedLead?._id === leadId) setSelectedLead(result.payload);
    } else toast.error(result.payload || 'Stage update failed');
  };

  const handleRegressionSubmit = async (e) => {
    e.preventDefault();
    if (!regressionData.reason.trim()) return toast.error('Please provide a reason');

    const result = await dispatch(updateLeadStatus({
      leadId: regressionData.leadId,
      status: regressionData.toStatus,
      remark: `Regression: ${regressionData.fromStatus} to ${regressionData.toStatus}. Reason: ${regressionData.reason}`
    }));

    if (updateLeadStatus.fulfilled.match(result)) {
      toast.success(`Moved back to ${STAGE_CONFIG[regressionData.toStatus].label}`);
      setShowRegressionModal(false);
      setRegressionData({ leadId: '', fromStatus: '', toStatus: '', reason: '' });
      if (selectedLead?._id === regressionData.leadId) setSelectedLead(result.payload);
    } else toast.error(result.payload || 'Failed');
  };

  const handleScheduleFollowUp = async (e) => {
    e.preventDefault();
    const dateTime = new Date(`${followUpForm.date}T${followUpForm.time}`);
    const result = await dispatch(scheduleFollowUp({
      leadId: followUpLead._id,
      nextFollowUpDate: dateTime.toISOString(),
      followUpNote: followUpForm.note
    }));
    if (scheduleFollowUp.fulfilled.match(result)) {
      toast.success('Follow-up scheduled!');
      setShowFollowUpModal(false);
      setFollowUpLead(null);
      setFollowUpForm({ date: '', time: '', note: '' });
    } else toast.error(result.payload || 'Failed');
  };

  const openEdit = (lead) => {
    const l = lead || selectedLead;
    if (!l) return;
    setEditForm({
      name: l.name || '',
      email: l.email || '',
      contact: l.contact || '',
      company: l.company || '',
      source: l.source || 'manual',
      dealValue: l.dealValue || '',
      priority: l.priority || 'medium',
      assignedTo: l.assignedTo?._id || '',
      title: l.title || '',
      industry: l.industry || '',
      gstNumber: l.gstNumber || '',
      website: l.website || '',
      annualRevenue: l.annualRevenue || '',
      budgetRange: l.budgetRange || '',
      notes: l.notes || ''
    });
    setSelectedLead(l);
    setShowEditModal(true);
  };

  const openConvertModal = (lead) => {
    const l = lead || selectedLead;
    if (!l) return;
    setConvertForm({
      dealName: `${l.name} Opportunity`,
      amount: l.dealValue || '',
      closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      accountName: l.company || l.name
    });
    setSelectedLead(l);
    setShowConvertModal(true);
  };

  const handleConvert = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    const result = await dispatch(convertLead({ leadId: selectedLead._id, data: convertForm }));
    setActionLoading(false);
    if (convertLead.fulfilled.match(result)) {
      toast.success('Lead converted successfully!');
      setShowConvertModal(false);
      setSelectedLead(null);
    } else toast.error(result.payload || 'Conversion failed');
  };

  const handleMoveToPipeline = async () => {
    if (selectedIds.length === 0) return toast.error('Select leads to move');
    setActionLoading(true);
    const result = await dispatch(moveToPipeline(selectedIds));
    setActionLoading(false);
    if (moveToPipeline.fulfilled.match(result)) {
      toast.success(`Moved ${selectedIds.length} leads to Pipeline`);
      setSelectedIds([]);
      setViewMode('kanban'); // switch to kanban to show them
    } else toast.error(result.payload || 'Failed to move');
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return toast.error('Select leads to delete');
    setActionLoading(true);
    const result = await dispatch(bulkDeleteLeads(selectedIds));
    setActionLoading(false);
    
    if (bulkDeleteLeads.fulfilled.match(result)) {
      toast.success(result.payload?.message || 'Leads deleted');
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
    } else toast.error(result.payload || 'Failed to delete');
  };

  // Sort leads by createdDate descending (Newest leads first)
  const sortedLeads = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filteredLeads = (viewArchived ? archivedLeads : leads).filter(l => {
    // Separate Imported Leads and Active Pipeline
    if (viewMode === 'imported' && !l.isImported) return false;
    if (viewMode !== 'imported' && l.isImported) return false;

    // Hide leads that have an active (pending/upcoming) follow-up from the main board
    if (!viewArchived && l.nextFollowUpDate && l.status !== 'converted' && l.status !== 'lost') return false;

    return (
      l.name.toLowerCase().includes(searchQ.toLowerCase()) ||
      l.email?.toLowerCase().includes(searchQ.toLowerCase()) ||
      l.contact?.includes(searchQ) ||
      l.company?.toLowerCase().includes(searchQ.toLowerCase())
    );
  });

  const filtered = filteredLeads;
  const grouped = STAGES.reduce((acc, s) => {
    acc[s] = filtered.filter(l => l.status === s);
    return acc;
  }, {});

  const handleLoadMore = (stage) => {
    setColumnLimits(prev => ({
      ...prev,
      [stage]: prev[stage] + 30
    }));
  };

  const handleRefresh = () => {
    dispatch(fetchLeads());
    toast.success('Leads Refreshed');
  };

  const handleCallLead = async (lead) => {
    if (!lead.contact) return toast.error('Lead has no contact number');

    setCallingLeadId(lead._id);
    try {
      // 1. Get Token if missing
      let token = twilioToken;
      if (!token) {
        const result = await dispatch(getTwilioToken());
        token = result.payload;
      }

      // 2. Set Active Call State in Redux
      dispatch(setCurrentCall({
        id: lead._id,
        name: lead.name,
        number: lead.contact
      }));

      // 3. Start Calling
      await makeCall(token, lead.contact);
    } catch (err) {
      toast.error('Failed to start call');
    } finally {
      setCallingLeadId(null);
    }
  };

  const handleRemarkUpdate = async (leadId, remark) => {
    if (!remark) return;
    setRemarkUpdating(leadId);
    const result = await dispatch(updateQuickRemark({ leadId, remark }));
    setRemarkUpdating(null);
    if (updateQuickRemark.fulfilled.match(result)) {
      toast.success('Remark saved');
    } else {
      toast.error(result.payload || 'Failed to save remark');
    }
  };

  const totalValue = leads.reduce((s, l) => s + (l.dealValue || 0), 0);
  const wonCount = leads.filter(l => l.status === 'converted').length;
  const lostCount = leads.filter(l => l.status === 'lost').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">CRM Module</h1>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Sales & Relationship Management</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'leads' && (
            <>
              <button
                onClick={() => {
                  setViewArchived(!viewArchived);
                  if (!viewArchived) dispatch(fetchArchivedLeads());
                }}
                className={`btn-secondary text-[11px] font-bold flex items-center gap-2 px-3 py-2 shadow-sm ${viewArchived ? 'bg-amber-50 text-amber-600 border-amber-200' : ''}`}
              >
                {viewArchived ? <TrendingUp className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                {viewArchived ? 'View Active' : 'View Archive'}
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="btn-secondary text-[11px] font-bold flex items-center gap-2 px-3 py-2 shadow-sm"
              >
                <FileDown className="w-4 h-4" /> Import Excel
              </button>
              <button
                onClick={handleExportExcel}
                className="btn-secondary text-[11px] font-bold flex items-center gap-2 px-3 py-2 shadow-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              >
                <FileDown className="w-4 h-4" /> Export Excel
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary text-[11px] font-bold flex items-center gap-2 px-4 py-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Lead
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-2">
        {loading ? (
          <CRMSkeleton />
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            {activeTab === 'leads' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Leads', value: leads.length, icon: Activity, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Pipeline Value', value: `₹${(totalValue / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-violet-600 bg-violet-50' },
                    { label: 'Won', value: wonCount, icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
                    { label: 'Lost', value: lostCount, icon: XCircle, color: 'text-red-600 bg-red-50' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white border border-slate-50 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
                        <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search leads..."
                      value={searchQ}
                      onChange={e => setSearchQ(e.target.value)}
                      className="input-field pl-10 py-2 text-xs border-slate-100 bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setViewMode('kanban')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Kanban View"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Call Center View (Table)"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('imported')}
                        className={`p-1.5 rounded-lg transition-all ${viewMode === 'imported' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                        title="Imported Leads / Cold DB"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={handleRefresh}
                      className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all bg-white shadow-sm"
                      title="Refresh Leads"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    {viewArchived && (
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-[10px] text-amber-600 font-black uppercase tracking-widest">Archive Mode</span>
                      </div>
                    )}
                    {selectedIds.length > 0 && viewMode === 'imported' && (
                      <button
                        onClick={handleMoveToPipeline}
                        disabled={actionLoading}
                        className="btn-primary px-4 py-2 text-[10px] font-bold flex items-center gap-2 shadow-blue-100 bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Move to Pipeline ({selectedIds.length})
                      </button>
                    )}
                    {selectedIds.length > 0 && viewMode !== 'imported' && (
                      <button
                        onClick={() => setShowEmailSlider(true)}
                        className="btn-primary px-4 py-2 text-[10px] font-bold flex items-center gap-2 shadow-blue-100"
                      >
                        <Mail className="w-3.5 h-3.5" /> Email ({selectedIds.length})
                      </button>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{viewArchived ? archivedLeads.length : filtered.length} Leads</span>
                    </div>
                  </div>
                </div>

                {viewArchived ? (
                  <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Name</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Source</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {archivedLeads.map(l => (
                            <tr key={l._id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <p className="text-xs font-bold text-slate-700">{l.name}</p>
                                <p className="text-[10px] text-slate-400">{l.company || 'Private Client'}</p>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 font-medium">{l.contact}</td>
                              <td className="px-6 py-4">
                                <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full uppercase">{l.source}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleRestore(l._id)}
                                  className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all ml-auto"
                                  title="Restore Lead"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {archivedLeads.length === 0 && (
                            <tr>
                              <td colSpan="4" className="px-6 py-20 text-center">
                                <Archive className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 text-xs font-bold">No leads in archive</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : viewMode === 'table' ? (
                  <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-500">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead / Company</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Priority</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Remark</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filtered.map(lead => (
                            <tr key={lead._id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={selectedIds.includes(lead._id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setSelectedIds(prev => prev.includes(lead._id) ? prev.filter(id => id !== lead._id) : [...prev, lead._id]);
                                    }}
                                  />
                                  <div onClick={() => setSelectedLead(lead)} className="cursor-pointer">
                                    <p className="text-xs font-bold text-slate-700">{lead.name}</p>
                                    <div className="flex flex-col gap-1 mt-1">
                                      <p className="text-[10px] text-slate-400 font-bold uppercase">{lead.company || 'Private'}</p>
                                      {lead.nextFollowUpDate && (
                                        <div className="flex items-center gap-1 text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/50 w-fit">
                                          <Clock className="w-2.5 h-2.5" />
                                          <span>Follow-up: {new Date(lead.nextFollowUpDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                      )}
                                    </div>
                                    {lead.contact && (
                                      <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                        📞 {lead.contact}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase w-fit ${STAGE_CONFIG[lead.status].bg} ${STAGE_CONFIG[lead.status].color}`}>
                                    {STAGE_CONFIG[lead.status].label}
                                  </span>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase w-fit ${lead.priority === 'high' ? 'bg-red-50 text-red-600' :
                                    lead.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                    {lead.priority}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="relative group">
                                  <input
                                    type="text"
                                    defaultValue={lead.notes || ''}
                                    placeholder="Add a remark..."
                                    onBlur={(e) => handleRemarkUpdate(lead._id, e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRemarkUpdate(lead._id, e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 text-[11px] font-medium text-slate-600 focus:bg-white focus:border-blue-400 focus:shadow-sm transition-all pr-8"
                                  />
                                  {remarkUpdating === lead._id && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600">
                                      <Activity className="w-3 h-3 animate-pulse" />
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleCallLead(lead)}
                                    disabled={callingLeadId === lead._id}
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${callingLeadId === lead._id
                                      ? 'bg-blue-600 text-white animate-pulse'
                                      : 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white shadow-sm border border-green-100'
                                      }`}
                                    title="Call via Browser"
                                  >
                                    <Phone className={`w-4 h-4 ${callingLeadId === lead._id ? 'animate-bounce' : ''}`} />
                                  </button>
                                  <button
                                    onClick={() => setSelectedLead(lead)}
                                    className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-white hover:text-blue-600 border border-slate-100 transition-all"
                                  >
                                    <ArrowRightLeft className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filtered.length === 0 && (
                            <tr>
                              <td colSpan="4" className="px-6 py-20 text-center">
                                <Search className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No leads matched your search</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : viewMode === 'imported' ? (
                  <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-500">
                    <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                       <div>
                         <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Imported Leads Database (Data Bank)</h3>
                         <p className="text-[9px] text-slate-400 font-bold mt-0.5">Manage and edit your raw leads before moving to pipeline. Double-click any cell to edit.</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">Total: {filtered.length}</span>
                         {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => setShowBulkDeleteConfirm(true)} 
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all text-[9px] font-black uppercase"
                               >
                                 <Trash2 className="w-3 h-3" /> Delete {selectedIds.length}
                               </button>
                               <button 
                                 onClick={handleMoveToPipeline} 
                                 className="btn-primary py-1.5 px-4 text-[9px] rounded-lg"
                               >
                                 Move {selectedIds.length} to Pipeline
                               </button>
                            </div>
                         )}
                       </div>
                    </div>
                    <div className="overflow-auto max-h-[70vh] custom-scrollbar">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead className="sticky top-0 bg-slate-50 z-20 shadow-sm">
                          <tr>
                            <th className="px-3 py-3 w-10 border-r border-slate-100">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.length === filtered.length && filtered.length > 0}
                                onChange={() => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(l => l._id))}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </th>
                            {['name', 'contact', 'email', 'company', 'source', 'priority', 'dealValue', 'notes', 'title', 'industry', 'gstNumber', 'website'].map(h => (
                               <th key={h} className="px-4 py-3 font-black uppercase text-slate-400 border-r border-slate-100 whitespace-nowrap">{h}</th>
                            ))}
                            {/* Dynamic Custom Headers */}
                            {Array.from(new Set(filtered.flatMap(l => Object.keys(l.customFields || {})))).map(h => (
                               <th key={h} className="px-4 py-3 font-black uppercase text-blue-400 border-r border-slate-100 whitespace-nowrap bg-blue-50/30">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filtered.map(lead => (
                            <tr key={lead._id} className={`${selectedIds.includes(lead._id) ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'} transition-colors group`}>
                              <td className="px-3 py-3 border-r border-slate-100 text-center">
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                  checked={selectedIds.includes(lead._id)}
                                  onChange={() => setSelectedIds(prev => prev.includes(lead._id) ? prev.filter(id => id !== lead._id) : [...prev, lead._id])}
                                />
                              </td>
                              {/* Render Cells */}
                              {['name', 'contact', 'email', 'company', 'source', 'priority', 'dealValue', 'notes', 'title', 'industry', 'gstNumber', 'website'].map(field => (
                                <td 
                                  key={field} 
                                  className="px-4 py-3 border-r border-slate-100 whitespace-nowrap min-w-[120px]"
                                  onDoubleClick={() => setEditingCell({ leadId: lead._id, field })}
                                >
                                  {editingCell?.leadId === lead._id && editingCell?.field === field ? (
                                    <input
                                      autoFocus
                                      className="w-full bg-white border border-blue-400 rounded px-1.5 py-0.5 outline-none shadow-sm font-bold text-slate-700"
                                      defaultValue={lead[field]}
                                      onBlur={(e) => handleLeadCellEdit(lead._id, field, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleLeadCellEdit(lead._id, field, e.target.value);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                    />
                                  ) : (
                                    <span className={`font-bold ${!lead[field] ? 'text-slate-300 italic' : 'text-slate-600'}`}>
                                      {field === 'priority' ? (
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase ${lead.priority === 'high' ? 'bg-red-50 text-red-600' : lead.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}>
                                          {lead.priority || 'medium'}
                                        </span>
                                      ) : lead[field] || '---'}
                                    </span>
                                  )}
                                </td>
                              ))}
                              {/* Render Custom Cells */}
                              {Array.from(new Set(filtered.flatMap(l => Object.keys(l.customFields || {})))).map(field => (
                                <td 
                                  key={field} 
                                  className="px-4 py-3 border-r border-slate-100 whitespace-nowrap min-w-[120px] bg-blue-50/10"
                                  onDoubleClick={() => setEditingCell({ leadId: lead._id, field })}
                                >
                                  {editingCell?.leadId === lead._id && editingCell?.field === field ? (
                                    <input
                                      autoFocus
                                      className="w-full bg-white border border-blue-400 rounded px-1.5 py-0.5 outline-none shadow-sm font-bold text-slate-700"
                                      defaultValue={lead.customFields?.[field]}
                                      onBlur={(e) => handleLeadCellEdit(lead._id, field, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleLeadCellEdit(lead._id, field, e.target.value);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                    />
                                  ) : (
                                    <span className={`font-medium ${!lead.customFields?.[field] ? 'text-slate-300 italic' : 'text-slate-500'}`}>
                                      {lead.customFields?.[field] || '---'}
                                    </span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-5 overflow-x-auto pb-6 custom-scrollbar" style={{ scrollbarWidth: 'thin' }}>
                    {STAGES.map(stage => (
                      <div key={stage} className="flex-shrink-0 w-[280px]">
                        <div className="flex items-center justify-between px-2 mb-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-opacity-20 ${STAGE_CONFIG[stage].dot} ${STAGE_CONFIG[stage].dot.replace('bg-', 'ring-')}`} />
                            <span className={`text-[11px] font-black uppercase tracking-[1.5px] ${STAGE_CONFIG[stage].color}`}>
                              {STAGE_CONFIG[stage].label}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {grouped[stage]?.length || 0}
                          </span>
                        </div>
                        <div className="space-y-3 min-h-[500px]">
                          {grouped[stage]?.slice(0, columnLimits[stage]).map(lead => (
                            <div
                              key={lead._id}
                              onClick={() => setSelectedLead(lead)}
                              className={`bg-white border text-left rounded-xl p-4 cursor-pointer hover:shadow-md transition-all relative group overflow-hidden ${lead._id === selectedLead?._id ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-100'
                                }`}
                            >
                              <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                                lead.priority === 'high' ? 'bg-red-500' :
                                lead.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                              }`} />

                              {/* Urgency Indicator Border */}
                              {lead.nextFollowUpDate && (
                                <div className={`absolute inset-0 border-2 rounded-xl pointer-events-none ${
                                  new Date(lead.nextFollowUpDate) < new Date().setHours(0,0,0,0) ? 'border-red-500/20 shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]' :
                                  new Date(lead.nextFollowUpDate).toDateString() === new Date().toDateString() ? 'border-amber-500/20 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]' :
                                  'border-transparent'
                                }`} />
                              )}

                              <div className="flex items-start justify-between mb-2">
                                <h3 className="text-[12px] font-bold text-slate-800 leading-snug line-clamp-2 pr-6">{lead.name}</h3>
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer absolute top-4 right-4"
                                  checked={selectedIds.includes(lead._id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    setSelectedIds(prev => prev.includes(lead._id) ? prev.filter(id => id !== lead._id) : [...prev, lead._id]);
                                  }}
                                />
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 mb-2">
                                <Building2 className="w-3 h-3" /> {lead.company || 'Private Client'}
                              </p>
                              {lead.nextFollowUpDate && (
                                <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 bg-blue-50/50 px-2.5 py-1 rounded-lg border border-blue-100/50 w-fit mb-2">
                                  <Clock className="w-2.5 h-2.5 animate-pulse" />
                                  <span>Follow-up: {new Date(lead.nextFollowUpDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                                  <div className="flex flex-col gap-1.5">
                                    {lead.activityLog && lead.activityLog.length > 0 && (
                                      <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                        <MessageSquare className="w-3 h-3" />
                                        {lead.activityLog.length} interaction{lead.activityLog.length > 1 ? 's' : ''}
                                      </div>
                                    )}
                                    {lead.remarks && lead.remarks.length > 0 && (
                                      <p className="text-[9px] text-slate-500 italic line-clamp-1 border-l-2 border-slate-100 pl-2 max-w-[150px]">
                                        "{lead.remarks[lead.remarks.length - 1].text}"
                                      </p>
                                    )}
                                  </div>
                              </div>

                              {/* Mobile Stage Selector Removed */}
                              <div className="flex items-end justify-between mt-4">
                                <div>
                                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Est. Value</p>
                                  <p className="text-sm font-black text-blue-600">₹{(lead.dealValue || 0).toLocaleString('en-IN')}</p>
                                </div>
                                <div className="flex items-center gap-1.5 ml-auto">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFollowUpLead(lead);
                                      setShowFollowUpModal(true);
                                    }}
                                    className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-md hover:bg-blue-600 hover:text-white transition-all text-[7px] font-black uppercase tracking-tighter shadow-sm"
                                  >
                                    <Plus className="w-2 h-2" />
                                    Set Follow-up
                                  </button>
                                  <div className="w-6 h-6 rounded-lg bg-blue-100 border border-white flex items-center justify-center text-blue-600 text-[9px] font-black shadow-sm shrink-0">
                                    {(lead.name || 'L')[0].toUpperCase()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'call-center' && <CallHistoryTab />}
            {activeTab === 'contacts' && <ContactsTable />}
            {activeTab === 'accounts' && <AccountsTable />}
            {activeTab === 'deals' && <DealsKanban />}
            {activeTab === 'documents' && <DocumentsTable />}
            {activeTab === 'dashboard' && <CrmDashboard />}
            {activeTab === 'inbox' && <Inbox />}
            {activeTab === 'settings' && <EmailSettings />}
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* LEAD DETAILS MODAL (CENTERED) */}
      <LeadDetailModal
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        handleCall={handleCallLead}
        handleStageChange={handleStageChange}
        handleConvert={(lead) => {
          setConvertForm({
            dealName: `${lead.name} Deal`,
            amount: lead.dealValue || '',
            accountName: lead.company || '',
            closingDate: ''
          });
          setShowConvertModal(true);
        }}
      />

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-100 overflow-hidden animate-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">New Lead Capture</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700 text-2xl font-bold">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name *</label>
                  <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Job Title</label>
                  <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="CEO / Executive" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email ID</label>
                  <input type="email" className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Primary Phone *</label>
                  <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} required placeholder="+91..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Company / Firm</label>
                  <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">GST Number</label>
                  <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} placeholder="22AAAAA0000A1Z5" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
                  <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Est. Deal (₹)</label>
                  <input type="number" className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.dealValue} onChange={e => setForm({ ...form, dealValue: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Source</label>
                  <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-50">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border-none outline-none">Discard</button>
                <button type="submit" disabled={actionLoading} className="btn-primary px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2">
                  {actionLoading ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-100 overflow-hidden animate-in zoom-in duration-300">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Edit Lead Details</h2>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700 text-2xl font-bold">×</button>
            </div>
            <form onSubmit={handleUpdate} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6 text-left">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name *</label>
                  <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Job Title</label>
                  <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 text-left">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email ID</label>
                  <input type="email" className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Primary Phone *</label>
                  <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={editForm.contact} onChange={e => setEditForm({ ...editForm, contact: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 text-left">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Company</label>
                  <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={editForm.company} onChange={e => setEditForm({ ...editForm, company: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">GST Number</label>
                  <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={editForm.gstNumber} onChange={e => setEditForm({ ...editForm, gstNumber: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 text-left">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
                  <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Est. Value (₹)</label>
                  <input type="number" className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={editForm.dealValue} onChange={e => setEditForm({ ...editForm, dealValue: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Source</label>
                  <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={editForm.source} onChange={e => setEditForm({ ...editForm, source: e.target.value })}>
                    {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-50">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border-none outline-none">Cancel</button>
                <button type="submit" disabled={actionLoading} className="btn-primary px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 flex items-center gap-2">
                  {actionLoading ? 'Updating...' : 'Update Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConvertModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden animate-in zoom-in duration-300">
            <div className="px-6 py-5 border-b border-slate-50 bg-blue-50/30 flex flex-col items-center">
              <ArrowRightLeft className="w-8 h-8 text-blue-600 mb-2" />
              <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Convert to Opportunity</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-1">Finalize account and deal details</p>
            </div>
            <form onSubmit={handleConvert} className="p-6 space-y-4 text-left">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Account Name *</label>
                <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" value={convertForm.accountName} onChange={e => setConvertForm({ ...convertForm, accountName: e.target.value })} required />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Deal Name *</label>
                <input className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" value={convertForm.dealName} onChange={e => setConvertForm({ ...convertForm, dealName: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Amount (₹)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" value={convertForm.amount} onChange={e => setConvertForm({ ...convertForm, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Closing Date</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all" value={convertForm.closingDate} onChange={e => setConvertForm({ ...convertForm, closingDate: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <button type="button" onClick={() => setShowConvertModal(false)} className="flex-1 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
                  {actionLoading ? 'Converting...' : 'Convert Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Lead"
        message="Are you sure you want to delete this lead? This action cannot be undone."
      />

      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-in zoom-in duration-300">
            <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/50 flex flex-col items-center">
              <FileDown className="w-10 h-10 text-blue-600 mb-2" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Import Leads from Excel</h2>
              <p className="text-[10px] text-slate-400 font-bold mt-1">Columns: Name, Contact, Email, Company, Source, Priority, Value</p>
            </div>
            <form onSubmit={handleImport} className="p-8 space-y-6 text-left">
              {!importPreview ? (
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-white hover:border-blue-400 transition-all cursor-pointer group relative">
                  <input type="file" accept=".xlsx, .xls" onChange={e => {
                    setImportFile(e.target.files[0]);
                    handleImportPreview(e.target.files[0]);
                  }} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-blue-500 shadow-sm transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                  <p className="text-[11px] font-black text-slate-400 group-hover:text-blue-600 uppercase tracking-widest mt-4">
                    {importFile ? importFile.name : 'Choose Excel File'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-[300px] overflow-auto border border-slate-100 rounded-2xl custom-scrollbar">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead className="sticky top-0 bg-slate-50 z-10">
                        <tr>
                          <th className="px-3 py-2 font-black uppercase text-slate-400 border-r border-slate-100">Status</th>
                          {importPreview.length > 0 && Object.keys(importPreview[0])
                            .filter(k => !['isValid', 'error', 'Name', 'Contact'].includes(k))
                            .map(header => (
                              <th key={header} className="px-3 py-2 font-black uppercase text-slate-400 border-r border-slate-100 whitespace-nowrap">{header}</th>
                            ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {importPreview.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'hover:bg-slate-50 transition-colors' : 'bg-red-50'}>
                            <td className="px-3 py-2 uppercase font-black tracking-widest border-r border-slate-100 whitespace-nowrap">
                              {row.isValid ? <span className="text-green-500">Ready</span> : <span className="text-red-500" title={row.error}>Fix Me</span>}
                            </td>
                            {Object.keys(row)
                              .filter(k => !['isValid', 'error', 'Name', 'Contact'].includes(k))
                              .map(header => (
                                <td 
                                  key={header} 
                                  className="px-3 py-2 text-slate-600 border-r border-slate-100 whitespace-nowrap min-w-[120px]"
                                  onDoubleClick={() => setEditingCell({ rowIndex: idx, field: header })}
                                >
                                  {editingCell?.rowIndex === idx && editingCell?.field === header ? (
                                    <input
                                      autoFocus
                                      className="w-full bg-blue-50 border border-blue-200 rounded px-1 outline-none text-[10px]"
                                      defaultValue={row[header]}
                                      onBlur={(e) => handleCellEdit(idx, header, e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCellEdit(idx, header, e.target.value);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                    />
                                  ) : (
                                    <span className={!row[header] ? 'text-slate-300' : ''}>
                                      {row[header] || '---'}
                                    </span>
                                  )}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center text-[10px] bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                    <div className="flex gap-4">
                      <span className="text-slate-500 font-bold">Total: {importPreview.length}</span>
                      <span className="text-red-500 font-bold">Errors: {importPreview.filter(r => !r.isValid).length}</span>
                    </div>
                    <button type="button" onClick={() => { setImportFile(null); setImportPreview(null); }} className="text-blue-600 font-black uppercase hover:underline">Change File</button>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold italic">* Tip: Double-click any cell to edit details directly.</p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => { setShowImportModal(false); setImportPreview(null); }} className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors border-none outline-none">Cancel</button>
                  <button type="submit" disabled={actionLoading || (importPreview && importPreview.some(r => !r.isValid))} className="flex-1 btn-primary py-3 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 disabled:opacity-50">
                    {actionLoading ? 'Importing...' : importPreview ? 'Confirm & Import' : 'Next: Preview Data'}
                  </button>
                </div>
                {!importPreview && (
                  <button type="button" onClick={handleDownloadTemplate} className="w-full py-2 text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors uppercase tracking-widest flex items-center justify-center gap-2">
                    <FileDown className="w-3.5 h-3.5" /> Download Sample Template
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={handleArchive}
        title="Archive Lead"
        message="This lead will be moved to the archive section. You can restore it anytime later."
      />

      <ConfirmModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.length} Leads`}
        message="Are you sure you want to delete these leads permanently? This action cannot be undone."
      />

      <EmailSlideOver
        isOpen={showEmailSlider}
        onClose={() => setShowEmailSlider(false)}
        selectedItems={leads.filter(l => selectedIds.includes(l._id))}
        onSuccess={() => setSelectedIds([])}
      />

      <LeadDetailModal
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        handleCall={handleCallLead}
        handleStageChange={handleStageChange}
        handleConvert={openConvertModal}
        handleRemark={handleRemarkUpdate}
        handleEdit={openEdit}
      />

      {/* QUICK NOTE & FOLLOW-UP MODAL */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Quick Follow-up</h2>
              </div>
              <button onClick={() => { setShowFollowUpModal(false); setFollowUpLead(null); }} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
            </div>
            <form onSubmit={handleScheduleFollowUp} className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Lead: <span className="text-slate-900">{followUpLead?.name}</span></p>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Interaction Note</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-medium outline-none focus:ring-4 focus:ring-blue-50 transition-all min-h-[80px]"
                  placeholder="What was the client's response?"
                  value={followUpForm.note}
                  onChange={e => setFollowUpForm({ ...followUpForm, note: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Next Date</label>
                  <input
                    type="date"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none"
                    value={followUpForm.date}
                    onChange={e => setFollowUpForm({ ...followUpForm, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Next Time</label>
                  <input
                    type="time"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs font-bold outline-none"
                    value={followUpForm.time}
                    onChange={e => setFollowUpForm({ ...followUpForm, time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowFollowUpModal(false); setFollowUpLead(null); }}
                  className="flex-1 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  Save & Set
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGRESSION REASON MODAL */}
      {showRegressionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-50 bg-red-50/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Reason for Regression</h2>
              </div>
              <button onClick={() => setShowRegressionModal(false)} className="text-slate-400 hover:text-slate-700 text-xl">×</button>
            </div>
            <form onSubmit={handleRegressionSubmit} className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-500 mb-2 uppercase">Moving back from <span className="text-red-600">{regressionData.fromStatus}</span> to <span className="text-blue-600">{regressionData.toStatus}</span></p>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Why are you moving back?</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-medium outline-none focus:ring-4 focus:ring-red-50 transition-all min-h-[100px]"
                  placeholder="Provide a valid reason for this regression..."
                  value={regressionData.reason}
                  onChange={e => setRegressionData({ ...regressionData, reason: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegressionModal(false)}
                  className="flex-1 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 active:scale-95 transition-all"
                >
                  Confirm Back
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
