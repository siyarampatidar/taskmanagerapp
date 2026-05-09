import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { 
    Clock, Building2, TrendingUp, Filter, Search, 
    MoreHorizontal, Briefcase, PlusCircle, Pencil, Trash2, X, Mail,
    Activity, User, ChevronRight, UserCheck, Archive, PlusSquare, FileUp, FileText, CreditCard, Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
    updateDealStage, createDeal, updateDeal, deleteDeal, assignDeal, 
    addDealNote, uploadDealDocument, setDealFollowUp,
    fetchArchivedDeals, restoreDeal, getCRMConfig, fetchDeals
} from '../../redux/slices/crmSlice';
import { createTask } from '../../redux/slices/taskSlice';
import EmailSlideOver from './EmailSlideOver';
import ConfirmModal from '../common/ConfirmModal';
import confetti from 'canvas-confetti';
import { fetchInvoices } from '../../redux/slices/billingSlice';

const STAGES = [
    { id: 'qualification', label: 'Qualification', color: 'bg-slate-400' },
    { id: 'needs-analysis', label: 'Needs Analysis', color: 'bg-blue-400' },
    { id: 'value-proposition', label: 'Value Proposition', color: 'bg-indigo-400' },
    { id: 'proposal', label: 'Proposal/Price Quote', color: 'bg-violet-400' },
    { id: 'negotiation', label: 'Negotiation/Review', color: 'bg-amber-400' },
    { id: 'closed-won', label: 'Closed Won', color: 'bg-green-500' },
    { id: 'closed-lost', label: 'Closed Lost', color: 'bg-red-400' }
];

const getDealTemperature = (amount) => {
    if (amount >= 500000) return { label: 'HOT 🌟', cls: 'bg-red-50 text-red-600 border border-red-100' };
    if (amount >= 100000) return { label: 'WARM 🔥', cls: 'bg-orange-50 text-orange-600 border border-orange-100' };
    return { label: 'COLD ❄️', cls: 'bg-blue-50 text-blue-600 border border-blue-100' };
};

export default function DealsKanban() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { deals, accounts, contacts, loading, archivedDeals, allowedDealRoles } = useSelector(state => state.crm);
    const { user } = useSelector(state => state.auth || { user: {} });
    const [searchQ, setSearchQ] = useState('');
    const [viewArchived, setViewArchived] = useState(false);

    // Modal States
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [form, setForm] = useState({ name: '', amount: '', stage: 'qualification', closingDate: '', accountId: '', contactId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Drag and Drop States
    const [draggedDealId, setDraggedDealId] = useState(null);

    // Bulk Selection & Email States
    const [selectedIds, setSelectedIds] = useState([]);
    const [showEmailSlider, setShowEmailSlider] = useState(false);

    // Handover Task States
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [wonDeal, setWonDeal] = useState(null);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'high', deadline: '', assignedTo: '', targetDeptId: '', assignmentType: 'department', attachments: [] });
    const { employees, departments } = useSelector(state => state.hr || { employees: [], departments: [] });
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    
    // Billing related
    const { invoices } = useSelector(state => state.billing || { invoices: [] });

    // Deal Detail & Assign States
    const [selectedDeal, setSelectedDeal] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTarget, setAssignTarget] = useState(null);
    const [assignTo, setAssignTo] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    // Deal Tabs & Info States
    const [dealTab, setDealTab] = useState('info');
    const [newNote, setNewNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [followUpForm, setFollowUpForm] = useState({ date: '', note: '' });
    const [isSavingFollowUp, setIsSavingFollowUp] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [dealToDelete, setDealToDelete] = useState(null);

    React.useEffect(() => {
        dispatch(getCRMConfig());
        dispatch(fetchInvoices());
    }, [dispatch]);

    const filtered = deals.filter(d => 
        (d.name?.toLowerCase().includes(searchQ.toLowerCase()) ||
        d.accountId?.name?.toLowerCase().includes(searchQ.toLowerCase()))
    );

    const handleSelectDeal = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const grouped = STAGES.reduce((acc, stage) => {
        acc[stage.id] = filtered.filter(d => d.stage === stage.id);
        return acc;
    }, {});
    
    const triggerCelebration = () => {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            strokeWidth: 2,
            colors: ['#22c55e', '#3b82f6', '#f59e0b']
        });
    };

    // DND Handlers
    const handleDragStart = (e, dealId) => {
        setDraggedDealId(dealId);
        e.dataTransfer.setData('dealId', dealId);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            if(e.target) e.target.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e) => {
        if(e.target) e.target.style.opacity = '1';
        setDraggedDealId(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, stageId) => {
        e.preventDefault();
        const dealId = e.dataTransfer.getData('dealId') || draggedDealId;
        if(!dealId) return;
        
        const deal = deals.find(d => d._id === dealId);
        if(deal && deal.stage !== stageId) {
            const res = await dispatch(updateDealStage({ id: dealId, stage: stageId }));
            if(updateDealStage.fulfilled.match(res)) {
                toast.success('Stage updated');
                
                if (stageId === 'closed-won') {
                    triggerCelebration();
                    const updatedDeal = res.payload.deal || deal;
                    setWonDeal(updatedDeal);
                    setTaskForm({
                         title: `Handover: ${updatedDeal.name}`,
                         description: `Deal Value: ₹${(updatedDeal.amount || 0).toLocaleString('en-IN')}\nAccount: ${updatedDeal.accountId?.name || 'N/A'}\n\nPlease proceed with service delivery.`,
                         priority: 'high',
                         deadline: '',
                         assignedTo: '',
                         targetDeptId: '',
                         assignmentType: 'department',
                         attachments: []
                    });
                    setShowTaskModal(true);
                }
            } else {
                toast.error('Failed to update stage');
            }
        }
    };

    // Modal Handlers
    const openAdd = () => {
        setForm({ name: '', amount: '', stage: 'qualification', closingDate: '', accountId: '', contactId: '' });
        setIsEditing(false);
        setShowModal(true);
    };

    const openEdit = (deal) => {
        setSelectedId(deal._id);
        setForm({ 
            name: deal.name, 
            amount: deal.amount || '', 
            stage: deal.stage || 'qualification', 
            closingDate: deal.closingDate ? new Date(deal.closingDate).toISOString().split('T')[0] : '', 
            accountId: deal.accountId?._id || '',
            contactId: deal.contactId?._id || ''
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleAssignSubmit = async (e) => {
        e.preventDefault();
        if (!assignTo) return;
        setIsAssigning(true);
        const res = await dispatch(assignDeal({ id: assignTarget._id, assignedTo: assignTo }));
        setIsAssigning(false);
        if (assignDeal.fulfilled.match(res)) {
            toast.success('Deal assigned successfully!');
            setShowAssignModal(false);
            setAssignTo('');
            setAssignTarget(null);
            if (selectedDeal?._id === assignTarget._id) setSelectedDeal(res.payload);
        } else {
            toast.error(res.payload || 'Failed to assign');
        }
    };

    const handleTaskSubmit = async (e) => {
        e.preventDefault();
        setIsCreatingTask(true);
        const formData = new FormData();
        formData.append('title', taskForm.title);
        formData.append('description', taskForm.description);
        formData.append('priority', taskForm.priority);
        formData.append('deadline', taskForm.deadline);
        if (taskForm.assignmentType === 'individual') {
            formData.append('assignedTo', taskForm.assignedTo || user?._id);
        } else {
            formData.append('targetDeptId', taskForm.targetDeptId);
        }
        formData.append('subTasks', JSON.stringify([]));
        if (wonDeal) formData.append('dealId', wonDeal._id);
        if (taskForm.attachments && taskForm.attachments.length > 0) {
            Array.from(taskForm.attachments).forEach(f => formData.append('attachments', f));
        }

        const res = await dispatch(createTask(formData));
        setIsCreatingTask(false);
        if (createTask.fulfilled.match(res)) {
            toast.success('Operations Handover Task Created!');
            setShowTaskModal(false);
            if (wonDeal) {
                dispatch(fetchDeals());
            }
            setWonDeal(null);
        } else {
            toast.error(res.payload || 'Failed to create task');
        }
    };

    const handleMobileStageChange = async (dealId, stage) => {
        const res = await dispatch(updateDealStage({ id: dealId, stage }));
        if (updateDealStage.fulfilled.match(res)) {
            toast.success('Stage updated');
            if (stage === 'closed-won') {
                triggerCelebration();
                const d = res.payload.deal;
                setWonDeal(d);
                setTaskForm({
                        title: `Handover: ${d.name}`,
                        description: `Deal Value: ₹${(d.amount || 0).toLocaleString('en-IN')}\nAccount: ${d.accountId?.name || 'N/A'}\n\nPlease proceed with service delivery.`,
                        priority: 'high',
                        deadline: '',
                        assignedTo: '',
                        targetDeptId: '',
                        assignmentType: 'department',
                        attachments: []
                });
                setShowTaskModal(true);
            }
        }
        else toast.error('Failed to update stage');
    };

    const handleRestore = async (id) => {
        const res = await dispatch(restoreDeal(id));
        if (restoreDeal.fulfilled.match(res)) toast.success('Deal restored');
        else toast.error('Failed to restore');
    };

    const toggleArchive = () => {
        if (!viewArchived) dispatch(fetchArchivedDeals());
        setViewArchived(!viewArchived);
    };

    const handleDelete = (id) => {
        setDealToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if(!dealToDelete) return;
        const res = await dispatch(deleteDeal(dealToDelete));
        if(deleteDeal.fulfilled.match(res)) toast.success('Deal Archived');
        else toast.error('Failed to archive');
        setDealToDelete(null);
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if(!newNote) return;
        setIsSavingNote(true);
        const res = await dispatch(addDealNote({ id: selectedDeal._id, text: newNote }));
        setIsSavingNote(false);
        if(addDealNote.fulfilled.match(res)) {
            setNewNote('');
            setSelectedDeal(res.payload);
            toast.success('Note added');
        } else toast.error('Failed to add note');
    };

    const handleUploadDoc = async (e) => {
        const files = e.target.files;
        if(!files || files.length === 0) return;
        setIsUploading(true);
        const formData = new FormData();
        Array.from(files).forEach(f => formData.append('files', f));
        const res = await dispatch(uploadDealDocument({ id: selectedDeal._id, formData }));
        setIsUploading(false);
        if(uploadDealDocument.fulfilled.match(res)) {
            setSelectedDeal(res.payload);
            toast.success('Document uploaded');
        } else toast.error('Upload failed');
    };

    const handleSaveFollowUp = async (e) => {
        e.preventDefault();
        if(!followUpForm.date) return;
        setIsSavingFollowUp(true);
        const res = await dispatch(setDealFollowUp({ id: selectedDeal._id, ...followUpForm }));
        setIsSavingFollowUp(false);
        if(setDealFollowUp.fulfilled.match(res)) {
            setSelectedDeal(res.payload);
            setFollowUpForm({ date: '', note: '' });
            toast.success('Follow-up scheduled');
        } else toast.error('Failed to schedule');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        let payload = { ...form };
        if(!payload.accountId) delete payload.accountId;
        if(!payload.contactId) delete payload.contactId;

        let res;
        if(isEditing) {
            res = await dispatch(updateDeal({ id: selectedId, data: payload }));
        } else {
            res = await dispatch(createDeal({ ...payload, ownerId: user?._id }));
        }
        setIsSubmitting(false);

        if(res.type.endsWith('fulfilled')) {
            toast.success(`Deal ${isEditing ? 'updated' : 'created'}!`);
            setShowModal(false);

            if (payload.stage === 'closed-won') {
                triggerCelebration();
                const d = res.payload.deal || res.payload;
                setWonDeal(d);
                setTaskForm({
                    title: `Handover: ${d.name}`,
                    description: `Deal Value: ₹${(d.amount || 0).toLocaleString('en-IN')}\nAccount: ${d.accountId?.name || 'N/A'}\n\nPlease proceed with service delivery.`,
                    priority: 'high',
                    deadline: '',
                    assignedTo: '',
                    targetDeptId: '',
                    assignmentType: 'department',
                    attachments: []
                });
                setShowTaskModal(true);
            }
        } else {
            toast.error(res.payload || 'An error occurred');
        }
    };

    const handleGenerateInvoice = (deal) => {
        navigate('/dashboard/billing', { 
            state: { 
                prefill: {
                    clientId: deal.accountId?._id || deal.accountId,
                    dealId: deal._id,
                    amount: deal.amount,
                    name: deal.name,
                    items: [{ description: `Service for ${deal.name}`, quantity: 1, rate: deal.amount || 0, amount: deal.amount || 0 }]
                },
                openModal: true
            } 
        });
    };

    return (
        <div className="space-y-6">
            {/* Toolbar / Action Bar */}
            <div className="flex items-center justify-between min-h-[48px] relative">
                {selectedIds.length > 0 ? (
                    <div className="absolute inset-0 bg-blue-50/80 backdrop-blur-sm z-10 flex items-center justify-between px-4 rounded-xl border border-blue-100 animate-in fade-in duration-200">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg">
                                {selectedIds.length} Record(s) Selected
                            </span>
                            <button onClick={() => setSelectedIds([])} className="text-[11px] font-bold text-blue-500 hover:text-blue-700">
                                Clear
                            </button>
                        </div>
                        <button 
                            onClick={() => setShowEmailSlider(true)}
                            className="btn-primary px-4 py-1.5 text-[11px] font-bold flex items-center gap-2 shadow-blue-100"
                        >
                            <Mail className="w-3.5 h-3.5" /> Send Email
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-3 bg-white border border-slate-100 p-1.5 rounded-xl shadow-sm">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Find deals..." 
                                    className="pl-9 pr-4 py-1.5 text-xs bg-slate-50 border-none rounded-lg w-48 focus:ring-1 focus:ring-blue-100"
                                    value={searchQ}
                                    onChange={e => setSearchQ(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Pipeline</p>
                                <p className="text-sm font-black text-blue-600">
                                    ₹{deals.reduce((s, d) => s + (d.amount || 0), 0).toLocaleString('en-IN')}
                                </p>
                            </div>
                            <button onClick={openAdd} className="btn-primary py-1.5 px-4 text-xs font-bold flex items-center gap-2">
                                <PlusCircle className="w-4 h-4" /> New Deal
                            </button>
                            <button 
                                onClick={toggleArchive} 
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-2 transition-all ${
                                    viewArchived ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Filter className="w-4 h-4" /> {viewArchived ? 'Active Pipeline' : 'View Archive'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {viewArchived ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Archived Deals (Storage)</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Deals that were either won, lost, or deleted are kept here for records.</p>
                    </div>
                    <div className="divide-y divide-slate-50 overflow-y-auto max-h-[600px]">
                        {archivedDeals.length > 0 ? (
                            archivedDeals.map(deal => (
                                <div key={deal._id} onClick={() => setSelectedDeal(deal)} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-700">{deal.name}</h4>
                                            <p className="text-[11px] text-slate-400 font-medium">
                                                {deal.accountId?.name || 'No Account'} · ₹{(deal.amount || 0).toLocaleString()} · {deal.stage}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleRestore(deal._id); }}
                                        className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all transform group-hover:scale-105"
                                    >
                                        Restore
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center">
                                <Filter className="w-12 h-12 text-slate-100 mx-auto mb-3" />
                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No Archived Deals Found</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide select-none" style={{ minHeight: 'calc(100vh - 280px)' }}>
                    {STAGES.map(stage => (
                        <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col gap-3">
                            {/* Column Header */}
                            <div className="flex items-center justify-between px-2 mb-1">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${stage.color} shadow-sm`} />
                                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{stage.label}</h4>
                                    <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {grouped[stage.id]?.length || 0}
                                    </span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">
                                    ₹{grouped[stage.id]?.reduce((s,d) => s + (d.amount||0), 0).toLocaleString('en-IN')}
                                </span>
                            </div>

                            {/* Drop Area / Cards List */}
                            <div 
                                className={`flex-1 space-y-3 bg-slate-50/50 p-2 rounded-2xl border border-dashed transition-colors min-h-[400px] ${
                                    draggedDealId ? 'border-blue-300 bg-blue-50/20' : 'border-slate-200/50'
                                }`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                {grouped[stage.id]?.map(deal => (
                                    <div 
                                        key={deal._id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, deal._id)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => setSelectedDeal(deal)}
                                        className={`bg-white border rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                                            selectedIds.includes(deal._id) ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-blue-200'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2 gap-2">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-0.5"
                                                checked={selectedIds.includes(deal._id)}
                                                onChange={(e) => { e.stopPropagation(); handleSelectDeal(deal._id); }}
                                                style={{ opacity: selectedIds.includes(deal._id) ? 1 : undefined }}
                                            />
                                            <h5 className="text-[12px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1 flex-1">
                                                {deal.name}
                                            </h5>
                                            <div className="flex items-center gap-1">
                                                <button onClick={(e) => { e.stopPropagation(); openEdit(deal); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit Deal">
                                                    <Pencil className="w-3 h-3" />
                                                </button>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setWonDeal(deal); 
                                                        setTaskForm({
                                                            title: `Task: ${deal.name}`,
                                                            description: `Deal: ${deal.name}\nAccount: ${deal.accountId?.name || 'N/A'}\nValue: ₹${(deal.amount || 0).toLocaleString('en-IN')}`,
                                                            priority: 'medium',
                                                            deadline: '',
                                                            assignedTo: '',
                                                            targetDeptId: '',
                                                            assignmentType: 'department',
                                                            attachments: []
                                                        });
                                                        setShowTaskModal(true);
                                                    }} 
                                                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 group/task" 
                                                    title="Create Operations Task"
                                                >
                                                    <PlusSquare className="w-3 h-3" />
                                                    <span className="text-[7px] font-black uppercase hidden group-hover:inline group-hover/task:inline whitespace-nowrap">Task</span>
                                                </button>
                                                {deal.stage === 'closed-won' && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(deal); }} 
                                                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded flex items-center gap-1 group/bill" 
                                                        title="Generate Invoice"
                                                    >
                                                        <CreditCard className="w-3.5 h-3.5" />
                                                        <span className="text-[7px] font-black uppercase hidden group-hover/bill:inline whitespace-nowrap">Bill</span>
                                                    </button>
                                                )}
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(deal._id); }} className="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Archive Deal">
                                                    <Archive className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Mobile Stage Selector */}
                                        <div className="md:hidden mb-3">
                                            <select 
                                                className="w-full text-[10px] font-bold bg-slate-50 border-slate-100 rounded-lg py-1 px-2 text-slate-600"
                                                value={deal.stage}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => handleMobileStageChange(deal._id, e.target.value)}
                                            >
                                                <option disabled>Move to Stage...</option>
                                                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2 mb-2">
                                            <Building2 className="w-3 h-3 text-slate-300" />
                                            <p className="text-[10px] font-medium text-slate-400 truncate flex-1">
                                                {deal.accountId?.name || 'No Account'}
                                            </p>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${getDealTemperature(deal.amount || 0).cls}`}>
                                                    {getDealTemperature(deal.amount || 0).label}
                                                </span>
                                                {deal.updatedAt && (
                                                    <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-1 py-0.5 rounded">
                                                        {Math.floor((new Date() - new Date(deal.updatedAt)) / (1000 * 60 * 60 * 24))}d
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Assigned Badge */}
                                        {deal.assignedTo ? (
                                            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-green-50 rounded-lg w-fit">
                                                <UserCheck className="w-3 h-3 text-green-600" />
                                                <span className="text-[10px] font-bold text-green-700">{deal.assignedTo.name}</span>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setAssignTarget(deal); setAssignTo(''); setShowAssignModal(true); }}
                                                className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-amber-50 rounded-lg w-fit hover:bg-amber-100 transition-colors"
                                            >
                                                <User className="w-3 h-3 text-amber-500" />
                                                <span className="text-[10px] font-bold text-amber-600">Assign</span>
                                            </button>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                            <div className="flex flex-col">
                                                <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tighter">Amount</p>
                                                <p className="text-xs font-black text-slate-700">₹{(deal.amount || 0).toLocaleString('en-IN')}</p>
                                            </div>
                                            <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase shadow-sm" title={deal.ownerId?.name}>
                                                {(deal.ownerId?.name || 'U')[0]}
                                            </div>
                                        </div>

                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {deal.closingDate && (
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg w-fit">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(deal.closingDate).toLocaleDateString()}
                                                </div>
                                            )}
                                            {deal.nextFollowUpDate && new Date(deal.nextFollowUpDate) <= new Date() && (
                                                <div className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-lg animate-pulse w-fit shadow-sm">
                                                    <Activity className="w-3 h-3" />
                                                    FOLLOW UP DUE
                                                </div>
                                            )}
                                        </div>

                                        {deal.stage === 'closed-won' && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(deal); }}
                                                className="w-full mt-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                                            >
                                                <CreditCard className="w-3.5 h-3.5" /> Generate Invoice
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {grouped[stage.id]?.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none mt-10">
                                        <Briefcase className="w-8 h-8 mb-2 text-slate-300" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Empty Stage</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Deal Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-blue-600" />
                                {isEditing ? 'Edit Deal' : 'New Deal'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Deal Name *</label>
                                <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Amount (₹)</label>
                                    <input type="number" className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Expected Close Date</label>
                                    <input type="date" className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.closingDate} onChange={e => setForm({...form, closingDate: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Pipeline Stage *</label>
                                    <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.stage} onChange={e => setForm({...form, stage: e.target.value})} required>
                                        {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Related Account</label>
                                    <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={form.accountId} onChange={e => setForm({...form, accountId: e.target.value})}>
                                        <option value="">-- Optional --</option>
                                        {accounts?.map(acc => <option key={acc._id} value={acc._id}>{acc.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn-primary px-6 py-2 text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                                    {isSubmitting ? 'Saving...' : 'Save Deal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deal Detail Modal */}
            {selectedDeal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[105] flex items-center justify-center p-4" onClick={() => setSelectedDeal(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in duration-200 max-h-[88vh]" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-start justify-between">
                            <div>
                                <h2 className="text-sm font-black text-slate-800">{selectedDeal.name}</h2>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{selectedDeal.accountId?.name || 'No Account'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {!selectedDeal.isArchived && (
                                    <button 
                                        onClick={() => { setAssignTarget(selectedDeal); setAssignTo(selectedDeal.assignedTo?._id || ''); setShowAssignModal(true); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
                                    >
                                        <UserCheck className="w-3.5 h-3.5" />
                                        {selectedDeal.assignedTo ? 'Reassign' : 'Assign'}
                                    </button>
                                )}
                                <button onClick={() => setSelectedDeal(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Tabs Navbar */}
                        <div className="border-b border-slate-100 flex px-6 space-x-6 bg-slate-50/20">
                            {['info', 'notes', 'docs', 'history'].map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setDealTab(tab)}
                                    className={`py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${dealTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                            <button 
                                onClick={() => setDealTab('billing')}
                                className={`py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${dealTab === 'billing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Invoices
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/10">
                            {dealTab === 'info' && (
                                <div className="space-y-6 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-blue-600 text-white rounded-2xl p-4 col-span-1 shadow-sm">
                                            <p className="text-[9px] font-black uppercase opacity-70 tracking-widest">Amount</p>
                                            <p className="text-xl font-black mt-1">₹{(selectedDeal.amount || 0).toLocaleString('en-IN')}</p>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Stage</p>
                                            <p className="text-xs font-black text-slate-700 mt-1 capitalize">{selectedDeal.stage?.replace(/-/g, ' ')}</p>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Closes</p>
                                            <p className="text-xs font-black text-slate-700 mt-1">{selectedDeal.closingDate ? new Date(selectedDeal.closingDate).toLocaleDateString('en-IN') : '—'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Owner</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">{(selectedDeal.ownerId?.name || 'U')[0]}</div>
                                                <span className="text-xs font-bold text-slate-700">{selectedDeal.ownerId?.name || 'Unknown'}</span>
                                            </div>
                                        </div>
                                        <div className={`rounded-xl p-3 border shadow-sm ${selectedDeal.assignedTo ? 'bg-green-50 border-green-100' : 'bg-white border-amber-200'}`}>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Assigned To</p>
                                            {selectedDeal.assignedTo ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-[10px] font-black text-green-700">{(selectedDeal.assignedTo.name || 'U')[0]}</div>
                                                    <span className="text-xs font-bold text-green-700">{selectedDeal.assignedTo.name}</span>
                                                </div>
                                            ) : (
                                                <p className="text-[11px] text-amber-600 font-bold">Not Assigned Yet</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Follow Up Section */}
                                    <form onSubmit={handleSaveFollowUp} className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm">
                                        <h3 className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5"/> Schedule Follow Up / Meeting</h3>
                                        <div className="flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                <input type="date" className="input-field bg-white border-red-200 text-xs text-red-900 rounded-lg flex-1" value={followUpForm.date} onChange={e => setFollowUpForm({...followUpForm, date: e.target.value})} required/>
                                                <button type="submit" disabled={isSavingFollowUp} className="btn-primary bg-red-600 hover:bg-red-700 border-red-700 px-4 py-2 text-[10px] shadow-red-200">{isSavingFollowUp ? 'Saving...' : 'Set Alarm'}</button>
                                            </div>
                                            <input type="text" placeholder="Meeting agenda or reminder note..." className="input-field bg-white border-red-200 text-xs text-red-900 rounded-lg" value={followUpForm.note} onChange={e => setFollowUpForm({...followUpForm, note: e.target.value})} />
                                        </div>
                                    </form>
                                </div>
                            )}

                            {dealTab === 'notes' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <form onSubmit={handleAddNote} className="flex flex-col gap-2 relative">
                                        <textarea className="input-field min-h-[100px] text-xs resize-none bg-yellow-50/50 border-yellow-200 focus:ring-yellow-400 placeholder:text-yellow-600/50" placeholder="Type a note representing a call, meeting, or internal thought..." value={newNote} onChange={e=>setNewNote(e.target.value)} required />
                                        <button type="submit" disabled={isSavingNote} className="absolute bottom-3 right-3 bg-yellow-400 text-yellow-900 px-4 py-1.5 rounded-lg text-xs font-black shadow-sm disabled:opacity-50">Add Note</button>
                                    </form>
                                    <div className="space-y-3">
                                        {selectedDeal.notes?.slice().reverse().map((n, i) => (
                                            <div key={i} className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 shadow-sm">
                                                <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap">{n.text}</p>
                                                <p className="text-[9px] font-bold text-yellow-600 mt-2 flex justify-between">
                                                    <span>{n.userId?.name || 'Unknown'}</span>
                                                    <span>{new Date(n.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                                </p>
                                            </div>
                                        ))}
                                        {(!selectedDeal.notes || selectedDeal.notes.length === 0) && (
                                            <p className="text-[11px] text-slate-400 text-center py-6 font-medium">No notes on this deal yet.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {dealTab === 'docs' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-2xl p-6 text-center relative group hover:bg-blue-50 transition-colors">
                                        <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleUploadDoc} disabled={isUploading} />
                                        <div className="flex flex-col items-center pointer-events-none">
                                            <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                                                {isUploading ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/> : <Briefcase className="w-5 h-5"/>}
                                            </div>
                                            <p className="text-xs font-black text-blue-700">Drop files or click to Upload</p>
                                            <p className="text-[10px] font-bold text-blue-400 mt-1">PDFs, Images, Excel allowed</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        {selectedDeal.documents?.slice().reverse().map((doc, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => {
                                                    const url = doc.url;
                                                    const fileUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_BACKEND_URL}/${url}`;
                                                    const downloadUrl = fileUrl.includes('cloudinary.com') 
                                                        ? fileUrl.replace('/upload/', '/upload/fl_attachment/')
                                                        : fileUrl;
                                                    window.open(downloadUrl, '_blank');
                                                }}
                                                className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group w-full text-left"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                                        <Briefcase className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-slate-800 truncate">{doc.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-medium">By {doc.uploadedBy?.name || 'Unknown'} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <Download className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </button>
                                        ))}
                                        {(!selectedDeal.documents || selectedDeal.documents.length === 0) && (
                                            <p className="text-[11px] text-slate-400 text-center py-6 font-medium">No documents attached.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {dealTab === 'billing' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Related Invoices</h3>
                                        <button 
                                            onClick={() => handleGenerateInvoice(selectedDeal)}
                                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:text-blue-700"
                                        >
                                            <PlusSquare className="w-3.5 h-3.5" /> Generate New
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {invoices.filter(inv => inv.dealId?._id === selectedDeal._id || inv.dealId === selectedDeal._id).map(inv => (
                                            <div key={inv._id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between group hover:border-blue-100 transition-all shadow-sm">
                                                <div>
                                                    <p className="text-[12px] font-black text-slate-800">{inv.invoiceNumber}</p>
                                                    <div className="flex flex-col gap-1.5 mt-2">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Total: ₹{inv.grandTotal.toLocaleString()}</span>
                                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Paid: ₹{(inv.paidAmount || 0).toLocaleString()}</span>
                                                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">Due: ₹{(inv.grandTotal - (inv.paidAmount || 0)).toLocaleString()}</span>
                                                        </div>
                                                        <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-emerald-500 transition-all duration-500" 
                                                                style={{ width: `${Math.min(100, ((inv.paidAmount || 0) / inv.grandTotal) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="mt-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                            inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                        }`}>
                                                            {inv.status}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => navigate('/dashboard/billing')}
                                                    className="p-2 bg-slate-50 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 hover:text-blue-600"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {invoices.filter(inv => inv.dealId?._id === selectedDeal._id || inv.dealId === selectedDeal._id).length === 0 && (
                                            <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No invoices linked to this deal</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {dealTab === 'history' && (
                                <div className="animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Activity className="w-4 h-4 text-slate-400" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Audit History</p>
                                    </div>
                                    <div className="space-y-0 relative pl-4">
                                        <div className="absolute left-[19px] top-2 bottom-2 w-[2px] bg-slate-100" />
                                        {selectedDeal.activityLog?.length > 0 ? (
                                            [...(selectedDeal.activityLog)].reverse().map((log, idx) => (
                                                <div key={idx} className="relative pb-6 last:pb-0 z-10 group">
                                                    <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-slate-200 flex-shrink-0 group-hover:border-blue-500 transition-colors" />
                                                    <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-default">
                                                        <p className="text-xs font-bold text-slate-800 leading-relaxed">{log.note}</p>
                                                        <p className="text-[9px] text-slate-400 mt-2 flex items-center justify-between border-t border-slate-50 pt-2">
                                                            {log.userId?.name ? <span className="font-black text-slate-500">{log.userId.name}</span> : <span>System</span>}
                                                            <span className="tabular-nums">{new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 font-medium">No activity recorded yet.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Deal Modal */}
            {showAssignModal && assignTarget && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100 overflow-hidden animate-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><UserCheck className="w-4 h-4 text-blue-600" /> Assign Deal</h3>
                            <button onClick={() => setShowAssignModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
                            <p className="text-[11px] text-slate-500 font-medium bg-slate-50 px-3 py-2 rounded-lg">Deal: <span className="font-black text-slate-700">{assignTarget.name}</span></p>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Employee *</label>
                                <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" required value={assignTo} onChange={e => setAssignTo(e.target.value)}>
                                    <option value="">-- Choose Employee --</option>
                                    {employees?.filter(emp => allowedDealRoles.includes(emp.role?.toLowerCase())).map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>)}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" disabled={isAssigning} className="flex-1 btn-primary py-2.5 text-xs font-black uppercase tracking-widest">
                                    {isAssigning ? 'Assigning...' : 'Confirm Assign'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Handover Modal */}
            {showTaskModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden animate-in zoom-in duration-300">
                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-green-600" />
                                Initiate Handover Task
                            </h2>
                            <button onClick={() => setShowTaskModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleTaskSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className={`${wonDeal?.stage === 'closed-won' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-blue-50 text-blue-700 border-blue-100'} p-3 rounded-xl border text-xs font-bold mb-4 flex items-start gap-2`}>
                                <div><span className={`w-2 h-2 rounded-full ${wonDeal?.stage === 'closed-won' ? 'bg-green-500' : 'bg-blue-500'} inline-block mt-0.5`}></span></div>
                                <p>
                                    {wonDeal?.stage === 'closed-won' 
                                        ? `Deal "${wonDeal?.name}" moved to Closed Won! Assign an operations task right away.`
                                        : `Create an operational task for deal "${wonDeal?.name}".`
                                    }
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Task Title *</label>
                                <input className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={taskForm.title} onChange={e => setTaskForm({...taskForm, title: e.target.value})} required />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Description (Requirements) *</label>
                                <textarea className="input-field bg-slate-50 border-slate-100 text-xs font-medium h-20" value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
                                    <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={taskForm.priority} onChange={e => setTaskForm({...taskForm, priority: e.target.value})}>
                                        <option value="high">HIGH</option>
                                        <option value="urgent">URGENT</option>
                                        <option value="medium">MEDIUM</option>
                                        <option value="low">LOW</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Deadline Date</label>
                                    <input type="date" className="input-field bg-slate-50 border-slate-100 text-xs font-bold" value={taskForm.deadline} onChange={e => setTaskForm({...taskForm, deadline: e.target.value})} required />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Handover To</label>
                                <div className="flex gap-2 mb-3 bg-slate-50 rounded-xl p-1 border border-slate-100">
                                    <button type="button" onClick={() => setTaskForm({...taskForm, assignmentType: 'department'})} className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${taskForm.assignmentType === 'department' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Department</button>
                                    <button type="button" onClick={() => setTaskForm({...taskForm, assignmentType: 'individual'})} className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${taskForm.assignmentType === 'individual' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Employee</button>
                                </div>

                                {taskForm.assignmentType === 'department' ? (
                                    <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" required value={taskForm.targetDeptId} onChange={e => setTaskForm({...taskForm, targetDeptId: e.target.value})}>
                                        <option value="">Select Target Department...</option>
                                        {departments?.map(d => <option key={d._id} value={d._id}>{d.name} Team</option>)}
                                    </select>
                                ) : (
                                    <select className="input-field bg-slate-50 border-slate-100 text-xs font-bold" required value={taskForm.assignedTo} onChange={e => setTaskForm({...taskForm, assignedTo: e.target.value})}>
                                        <option value="">Select Employee...</option>
                                        {employees?.map(emp => <option key={emp._id} value={emp._id}>{emp.name} ({emp.role})</option>)}
                                    </select>
                                )}
                            </div>

                            <div className="pt-2 border-t border-slate-50 mt-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Attach Documents (Optional)</label>
                                <div className={`border-2 border-dashed rounded-xl p-4 text-center relative group transition-colors ${taskForm.attachments?.length > 0 ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50 hover:bg-blue-50'}`}>
                                    <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setTaskForm({...taskForm, attachments: e.target.files})} />
                                    <div className="flex flex-col items-center pointer-events-none">
                                        <FileUp className={`w-5 h-5 mb-2 ${taskForm.attachments?.length > 0 ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} />
                                        <p className="text-[10px] font-bold text-slate-600">
                                            {taskForm.attachments?.length > 0 
                                                ? `${taskForm.attachments.length} file(s) selected` 
                                                : 'Drop files or click to Upload'
                                            }
                                        </p>
                                    </div>
                                </div>
                                {taskForm.attachments && taskForm.attachments.length > 0 && (
                                    <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto px-1">
                                        {Array.from(taskForm.attachments).map((file, i) => (
                                            <div key={i} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm animate-in slide-in-from-left-2 duration-200">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileText className="w-3 h-3 text-blue-500 flex-shrink-0" />
                                                    <p className="text-[10px] font-bold text-slate-700 truncate">{file.name}</p>
                                                    <span className="text-[8px] text-slate-400 font-medium flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                                                </div>
                                                <button type="button" onClick={() => {
                                                    const dt = new DataTransfer();
                                                    Array.from(taskForm.attachments).filter((_, idx) => idx !== i).forEach(f => dt.items.add(f));
                                                    setTaskForm({...taskForm, attachments: dt.files});
                                                }} className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-full transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-50">
                                <button type="button" onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-[11px] font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border-none outline-none">Skip Handover</button>
                                <button type="submit" disabled={isCreatingTask} className="btn-primary px-6 py-2 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-100">
                                    {isCreatingTask ? 'Pushing Task...' : 'Launch Mission'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Email Slide-Over */}
            <EmailSlideOver 
                isOpen={showEmailSlider}
                onClose={() => setShowEmailSlider(false)}
                selectedItems={deals.filter(d => selectedIds.includes(d._id)).map(d => ({
                    _id: d._id,
                    name: d.contactId?.name || d.accountId?.name || d.name,
                    email: d.contactId?.email || d.accountId?.email
                }))}
                onSuccess={() => setSelectedIds([])}
            />

            <ConfirmModal 
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                title="Archive Deal"
                message="Are you sure you want to move this deal to the archive? You can restore it later."
            />
        </div>
    );
}