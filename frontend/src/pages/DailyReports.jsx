import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
    fetchDailyReports, 
    submitDailyReport,
    updateDailyReport,
    deleteDailyReport
} from '../redux/slices/reportSlice';
import { 
    ChevronDown, ChevronRight, Clock, Building2,
    Edit2, Trash2, X,
    Send,
    Calendar,
    FileText,
    ClipboardList,
    Search,
    History,
    Download,
    Image,
    ThumbsUp,
    CheckCircle,
    Star,
    Paperclip,
    AlertCircle,
    MoreVertical
} from 'lucide-react';
import { 
    addReaction, 
    exportDailyReports 
} from '../redux/slices/reportSlice';
import { fetchDepartments } from '../redux/slices/hrSlice';
import { toast } from 'react-hot-toast';

const DailyReports = () => {
    const dispatch = useDispatch();
    const { user } = useSelector(state => state.auth);
    const { dailyReports, loading } = useSelector(state => state.reports);
    const { departments } = useSelector(state => state.hr);

    const [workDone, setWorkDone] = useState('');
    const [blockers, setBlockers] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [showBlockers, setShowBlockers] = useState(false);
    
    // Filters
    const [dateFilter, setDateFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [exporting, setExporting] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [editWorkDone, setEditWorkDone] = useState('');
    const [editBlockers, setEditBlockers] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    
    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [reportToDeleteId, setReportToDeleteId] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Toggle State
    const [viewMode, setViewMode] = useState('today'); // 'today' or 'history'

    const isAdminOrManager = ['admin', 'manager', 'hr'].includes(user?.role?.toLowerCase());
    const isTeamHead = user?.role?.toLowerCase() === 'teamhead';

    const getTodayStr = () => {
        const d = new Date();
        return d.toISOString().split('T')[0];
    };

    useEffect(() => {
        dispatch(fetchDepartments());
    }, [dispatch]);

    useEffect(() => {
        const params = {};
        const todayStr = getTodayStr();
        
        if (viewMode === 'today') {
            params.startDate = todayStr;
            params.endDate = todayStr;
        } else {
            if (dateFilter) {
                params.startDate = dateFilter;
                params.endDate = dateFilter;
            } else {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                params.endDate = yesterday.toISOString().split('T')[0];
            }
        }

        if (deptFilter) params.departmentId = deptFilter;
        if (userFilter) params.specificUserId = userFilter;
        
        dispatch(fetchDailyReports(params));
    }, [dispatch, dateFilter, viewMode, deptFilter, userFilter]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!workDone.trim()) {
            toast.error('Please describe your work');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('workDone', workDone);
            formData.append('blockers', blockers);
            if (dateFilter) formData.append('date', dateFilter);
            
            selectedFiles.forEach(file => {
                formData.append('attachments', file);
            });

            const result = await dispatch(submitDailyReport(formData));
            if (submitDailyReport.fulfilled.match(result)) {
                toast.success('Report submitted successfully');
                setWorkDone('');
                setBlockers('');
                setSelectedFiles([]);
                setShowBlockers(false);
                dispatch(fetchDailyReports());
            } else {
                toast.error(result.payload || 'Submission failed');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReaction = async (reportId, reactionType) => {
        try {
            await dispatch(addReaction({ id: reportId, reactionType }));
        } catch (err) {
            toast.error('Failed to react');
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const params = {};
            if (dateFilter) {
                params.startDate = dateFilter;
                params.endDate = dateFilter;
            }
            if (deptFilter) params.departmentId = deptFilter;
            await dispatch(exportDailyReports(params)).unwrap();
            toast.success('Report exported successfully');
        } catch (err) {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + selectedFiles.length > 3) {
            toast.error('Max 3 files allowed');
            return;
        }
        setSelectedFiles([...selectedFiles, ...files]);
    };

    const handleEditClick = (report) => {
        setEditingReport(report);
        setEditWorkDone(report.workDone);
        setEditBlockers(report.blockers || '');
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editWorkDone.trim()) {
            toast.error('Work description is required');
            return;
        }

        setIsUpdating(true);
        try {
            const result = await dispatch(updateDailyReport({ 
                id: editingReport._id, 
                data: { workDone: editWorkDone, blockers: editBlockers } 
            }));
            
            if (updateDailyReport.fulfilled.match(result)) {
                toast.success('Report updated');
                setIsEditModalOpen(false);
                setEditingReport(null);
            } else {
                toast.error(result.payload || 'Update failed');
            }
        } catch (err) {
            toast.error('Failed to update report');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteClick = (id) => {
        setReportToDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (!reportToDeleteId) return;
        setIsDeleting(true);
        try {
            const result = await dispatch(deleteDailyReport(reportToDeleteId));
            if (deleteDailyReport.fulfilled.match(result)) {
                const msg = result.payload?.message || 'Report removed';
                toast.success(msg);
                dispatch(fetchDailyReports());
                setIsDeleteModalOpen(false);
            } else {
                toast.error(result.payload || 'Failed to delete report');
            }
        } catch (error) {
            toast.error('An error occurred while deleting');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Daily Work Reports</h1>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[2px] mt-1">Track daily productivity and blockers</p>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                    <button 
                        onClick={() => setViewMode('today')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            viewMode === 'today' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Today
                    </button>
                    <button 
                        onClick={() => setViewMode('history')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            viewMode === 'history' 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <History className="w-3.5 h-3.5" />
                        History
                    </button>
                </div>

                {!isAdminOrManager && viewMode === 'today' && (
                    <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-black text-blue-700 uppercase tracking-widest">Submit Today's Report</span>
                    </div>
                )}

                {isAdminOrManager && (
                    <button 
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
                    >
                        {exporting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Download className="w-3.5 h-3.5" />
                        )}
                        {exporting ? 'Exporting...' : 'Export to Excel'}
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* ─── SUBMISSION FORM (Employee Only) ─── */}
                {viewMode === 'today' && !isAdminOrManager && (
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">

                            {/* Card Header */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Send className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-800">Send Today's Update</h2>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">

                                {/* Work Done */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5">
                                        What did you accomplish today?{' '}
                                        <span className="text-blue-500">*</span>
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all"
                                        rows="5"
                                        placeholder="Summarise tasks you completed, features built, meetings attended..."
                                        value={workDone}
                                        onChange={(e) => setWorkDone(e.target.value)}
                                        required
                                    />
                                    <p className="text-[11px] text-slate-300 text-right mt-1">
                                        {workDone.length} characters
                                    </p>
                                </div>

                                {/* Blockers — collapsible */}
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => setShowBlockers(prev => !prev)}
                                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors mb-2"
                                    >
                                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${showBlockers ? 'rotate-90' : ''}`} />
                                        Any blockers or challenges?
                                        <span className="text-slate-300 text-[11px]">(optional)</span>
                                    </button>

                                    {showBlockers && (
                                        <div className="space-y-2">
                                            <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-500">
                                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                                Your manager will be notified about blockers.
                                            </div>
                                            <textarea
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all"
                                                rows="3"
                                                placeholder="Technical issues, missing info, dependencies..."
                                                value={blockers}
                                                onChange={(e) => setBlockers(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="h-px bg-slate-100" />

                                {/* Attachments */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-2">
                                        Attachments{' '}
                                        <span className="font-normal text-slate-300">— screenshots, proof (max 3)</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedFiles.map((f, i) => (
                                            <div
                                                key={i}
                                                className="relative w-14 h-14 bg-slate-50 border border-slate-100 rounded-xl flex flex-col items-center justify-center group"
                                            >
                                                <Paperclip className="w-4 h-4 text-slate-300" />
                                                <span className="text-[9px] text-slate-400 mt-1">
                                                    {f.name.split('.').pop().toUpperCase()}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedFiles(selectedFiles.filter((_, idx) => idx !== i))}
                                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-100 text-red-500 rounded-full flex items-center justify-center transition-opacity text-[10px] font-bold leading-none"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                        {selectedFiles.length < 3 && (
                                            <label className="w-14 h-14 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all text-slate-300 hover:text-blue-400 gap-1">
                                                <Paperclip className="w-4 h-4" />
                                                <span className="text-[10px]">Add</span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                    accept="image/*,.pdf"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5" />
                                            Submit Report
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* ─── REPORTS LIST ─── */}
                <div className={`${(isAdminOrManager || viewMode === 'history') ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-6`}>
                    {/* Filters bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-4 flex-1">
                            <div className="relative w-full sm:w-40">
                                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="date"
                                    className="w-full bg-slate-50 border-transparent rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                            </div>

                            {isAdminOrManager && (
                                <div className="relative w-full sm:w-48">
                                    <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        className="w-full bg-slate-50 border-transparent rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none appearance-none"
                                        value={deptFilter}
                                        onChange={(e) => setDeptFilter(e.target.value)}
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(dept => (
                                            <option key={dept._id} value={dept._id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {isAdminOrManager && (
                                <div className="relative w-full sm:w-48">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input 
                                        type="text"
                                        placeholder="SEARCH EMPLOYEE..."
                                        className="w-full bg-slate-50 border-transparent rounded-xl pl-10 pr-4 py-2 text-[10px] font-black uppercase tracking-wider text-slate-600 focus:ring-2 focus:ring-blue-600/20 transition-all outline-none"
                                        value={userFilter}
                                        onChange={(e) => setUserFilter(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dailyReports.length} Reports Found</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-white rounded-3xl border border-slate-100 animate-pulse" />
                            ))}
                        </div>
                    ) : dailyReports.length === 0 ? (
                        <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 py-24 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
                                <FileText className="w-10 h-10" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">No Reports Yet</h3>
                            <p className="text-sm text-slate-400 font-medium">Daily work logs will appear here once submitted.</p>
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Group by Department if Admin/Manager */}
                            {Object.entries(
                                dailyReports.reduce((acc, report) => {
                                    const deptName = report.userId?.departmentId?.name || 'Unassigned';
                                    if (!acc[deptName]) acc[deptName] = [];
                                    acc[deptName].push(report);
                                    return acc;
                                }, {})
                            ).map(([deptName, reports]) => (
                                <div key={deptName} className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-px flex-1 bg-slate-100" />
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[3px] bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                                            {deptName} Division ({reports.length})
                                        </h3>
                                        <div className="h-px flex-1 bg-slate-100" />
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        {reports.map((report) => (
                                            <div 
                                                key={report._id}
                                                className="bg-white rounded-[2rem] border border-slate-100 p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                                            >
                                                <div className="flex items-start justify-between mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-100 relative overflow-hidden">
                                                            {report.userId?.image ? (
                                                                <img src={report.userId.image} className="w-full h-full object-cover" />
                                                            ) : (
                                                                report.userId?.name?.charAt(0) || '?'
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h3 className="font-bold text-slate-800">{report.userId?.name || 'Unknown'}</h3>
                                                                <span className="text-[10px] font-black px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full uppercase tracking-wider">
                                                                    {report.userId?.role || 'Employee'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                                    <Building2 className="w-3 h-3" /> {deptName}
                                                                </span>
                                                                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                                    <Calendar className="w-3 h-3" /> {new Date(report.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4 overflow-hidden">
                                                    <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                            <ClipboardList className="w-3 h-3" /> Work Accomplished
                                                        </p>
                                                        <p className="text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap break-words">
                                                            {report.workDone}
                                                        </p>
                                                    </div>

                                                    {report.blockers && (
                                                        <div className="p-5 bg-red-50/30 rounded-2xl border border-red-100 overflow-hidden">
                                                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <AlertCircle className="w-3 h-3" /> Blockers & Issues
                                                            </p>
                                                            <p className="text-sm text-red-700 leading-relaxed font-medium break-words">
                                                                {report.blockers}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {report.attachments?.length > 0 && (
                                                        <div className="flex flex-wrap gap-3">
                                                            {report.attachments.map((file, idx) => {
                                                                // Cloudinary attachment logic
                                                                const downloadUrl = file.startsWith('http') 
                                                                    ? file.replace('/upload/', '/upload/fl_attachment/')
                                                                    : `${import.meta.env.VITE_BACKEND_URL}/${file}`;
                                                                
                                                                return (
                                                                    <a 
                                                                        key={idx} 
                                                                        href={downloadUrl} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        download
                                                                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 text-[10px] font-bold hover:bg-blue-100 transition-all cursor-pointer shadow-sm active:scale-95"
                                                                        title="Click to download attachment"
                                                                    >
                                                                        <Download className="w-3.5 h-3.5" />
                                                                        Attachment {idx + 1}
                                                                    </a>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-50">
                                                    <div className="flex items-center gap-6">
                                                        {/* Reactions Row */}
                                                        <div className="flex items-center gap-2 bg-slate-50/50 p-1 rounded-xl">
                                                            {[
                                                                { type: '👍', icon: ThumbsUp, color: 'text-blue-500', bg: 'bg-blue-50' },
                                                                { type: '✅', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
                                                                { type: '🌟', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' }
                                                            ].map((emoji) => {
                                                                const count = (report.reactions || []).filter(r => r.reactionType === emoji.type).length;
                                                                const hasReacted = (report.reactions || []).some(r => r.reactionType === emoji.type && r.userId?._id === user?._id);
                                                                
                                                                return (
                                                                    <button
                                                                        key={emoji.type}
                                                                        onClick={() => handleReaction(report._id, emoji.type)}
                                                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all border ${
                                                                            hasReacted 
                                                                            ? `${emoji.bg} border-${emoji.color.split('-')[1]}-200 ${emoji.color}` 
                                                                            : 'border-transparent text-slate-400 hover:bg-white hover:border-slate-200'
                                                                        }`}
                                                                    >
                                                                        <emoji.icon className={`w-3.5 h-3.5 ${hasReacted ? 'animate-bounce' : ''}`} />
                                                                        {count > 0 && <span className="text-[10px] font-black">{count}</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="flex items-center gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" /> {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-3">
                                                        {viewMode === 'today' && (
                                                            <>
                                                                {(report.userId?._id?.toString() === (user?._id || user?.id)?.toString()) && (
                                                                    <button 
                                                                        onClick={() => handleEditClick(report)}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                                                                    >
                                                                        <Edit2 className="w-3 h-3" /> Edit
                                                                    </button>
                                                                )}
                                                                {(report.userId?._id?.toString() === (user?._id || user?._id)?.toString() || 
                                                                  ['admin', 'manager', 'hr', 'teamhead'].includes(user?.role?.toLowerCase())) && (
                                                                    <button 
                                                                        onClick={() => handleDeleteClick(report._id)}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" /> Delete
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
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
            </div>

            {/* ─── Edit Modal ─── */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
                    <div className="bg-white w-full max-w-lg rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto custom-scrollbar">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                <span className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                                    <Edit2 className="w-5 h-5" />
                                </span>
                                Edit Daily Report
                            </h2>
                            <button 
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">What did you accomplish? *</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-slate-100 rounded-3xl p-6 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-none resize-none"
                                    rows="6"
                                    value={editWorkDone}
                                    onChange={(e) => setEditWorkDone(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Blockers or challenges?</label>
                                <textarea 
                                    className="w-full bg-slate-50 border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all outline-none resize-none"
                                    rows="3"
                                    placeholder="Optional..."
                                    value={editBlockers}
                                    onChange={(e) => setEditBlockers(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-[2] bg-blue-600 text-white font-black uppercase tracking-[2px] text-xs py-4 rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50"
                                >
                                    {isUpdating ? 'Updating...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── Confirm Delete Modal ─── */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
                    />
                    <div className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Trash2 className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-xl font-black text-center text-slate-800 mb-2">Delete Report?</h2>
                        <p className="text-sm text-center text-slate-500 font-medium mb-8 leading-relaxed">
                            Are you sure you want to delete this report? This action cannot be undone.
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                disabled={isDeleting}
                                className="px-6 py-3.5 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className={`px-6 py-3.5 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-600 transition-all flex items-center justify-center gap-2 ${
                                    isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyReports;