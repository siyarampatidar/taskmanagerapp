import { useState, useEffect } from 'react';
import { 
    Clock, Phone, Calendar, CheckCircle2, Search,
    MessageSquare, User, TrendingUp, Building2,
    AlertCircle, MoreVertical, Check, Plus
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeads, scheduleFollowUp, updateLeadStatus, updateLead, updateQuickRemark } from '../redux/slices/crmSlice';
import { toast } from 'react-hot-toast';
import LeadDetailModal from '../components/crm/LeadDetailModal';

const STAGES = ['new', 'contacted', 'qualified', 'converted'];
const STAGE_CONFIG = {
    new:       { label: 'New',       color: 'text-slate-500',  bg: 'bg-slate-50',  icon: User },
    contacted: { label: 'Called',    color: 'text-blue-600',   bg: 'bg-blue-50',   icon: Phone },
    qualified: { label: 'Qualified', color: 'text-violet-600', bg: 'bg-violet-50', icon: TrendingUp },
    converted: { label: 'Won',       color: 'text-green-600',  bg: 'bg-green-50',  icon: CheckCircle2 },
};

const FollowUps = () => {
    const dispatch = useDispatch();
    const { leads, loading } = useSelector(state => state.crm);
    const [searchQ, setSearchQ] = useState('');
    const [filter, setFilter] = useState('all');
    
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [rescheduleData, setRescheduleData] = useState({ leadId: '', date: '', time: '', note: '' });
    const [showRegressionModal, setShowRegressionModal] = useState(false);
    const [regressionData, setRegressionData] = useState({ leadId: '', fromStatus: '', toStatus: '', reason: '' });

    // Details Modal State
    const [selectedLead, setSelectedLead] = useState(null);

    useEffect(() => { dispatch(fetchLeads()); }, [dispatch]);

    const getFollowUpStatus = (date) => {
        if (!date) return null;
        const now = new Date();
        const d = new Date(date);
        if (d.toDateString() === now.toDateString()) return 'today';
        if (d < now) return 'pending';
        return 'upcoming';
    };

    const handleStageUpdate = async (leadId, status) => {
        const lead = leads.find(l => l._id === leadId);
        if (!lead) return;
        const fromIdx = STAGES.indexOf(lead.status === 'lost' ? 'qualified' : lead.status);
        const toIdx = STAGES.indexOf(status);
        if (toIdx !== -1 && fromIdx !== -1 && toIdx < fromIdx) {
            setRegressionData({ leadId, fromStatus: lead.status, toStatus: status, reason: '' });
            setShowRegressionModal(true);
            return;
        }
        const result = await dispatch(updateLead({ leadId, data: { status, nextFollowUpDate: null } }));
        if (updateLead.fulfilled.match(result)) toast.success(`Stage updated to ${STAGE_CONFIG[status].label}. Moved to Leads section.`);
        else toast.error(result.payload || 'Update failed');
    };

    const handleRegressionSubmit = async (e) => {
        e.preventDefault();
        const result = await dispatch(updateLead({ 
            leadId: regressionData.leadId, 
            data: { status: regressionData.toStatus, nextFollowUpDate: null,
                remark: `Regression: ${regressionData.fromStatus} to ${regressionData.toStatus}. Reason: ${regressionData.reason}` }
        }));
        if (updateLead.fulfilled.match(result)) { toast.success('Stage moved back. Moved to Leads section.'); setShowRegressionModal(false); }
        else toast.error(result.payload || 'Failed');
    };

    const handleReschedule = async (e) => {
        e.preventDefault();
        const dateTime = new Date(`${rescheduleData.date}T${rescheduleData.time}`);
        const result = await dispatch(scheduleFollowUp({ leadId: rescheduleData.leadId, nextFollowUpDate: dateTime, followUpNote: rescheduleData.note }));
        if (scheduleFollowUp.fulfilled.match(result)) { toast.success('Follow-up rescheduled successfully'); setShowRescheduleModal(false); }
        else toast.error(result.payload || 'Failed');
    };

    const handleComplete = async (leadId) => {
        const result = await dispatch(updateLead({ leadId, data: { nextFollowUpDate: null } }));
        if (updateLead.fulfilled.match(result)) toast.success('Follow-up completed! Moved to Leads section.');
        else toast.error(result.payload || 'Failed');
    };

    const handleRemarkUpdate = async (leadId, remark) => {
        if (!remark) return;
        const result = await dispatch(updateQuickRemark({ leadId, remark }));
        if (updateQuickRemark.fulfilled.match(result)) {
            toast.success('Remark saved');
            if (selectedLead?._id === leadId) setSelectedLead(result.payload);
        } else {
            toast.error(result.payload || 'Failed to save remark');
        }
    };

    const filteredLeads = leads.filter(lead => {
        if (!lead.nextFollowUpDate || lead.status === 'converted' || lead.status === 'lost') return false;
        const status = getFollowUpStatus(lead.nextFollowUpDate);
        const matchesFilter = filter === 'all' || status === filter;
        const matchesSearch = lead.name.toLowerCase().includes(searchQ.toLowerCase()) || 
                             lead.company?.toLowerCase().includes(searchQ.toLowerCase());
        return matchesFilter && matchesSearch;
    }).sort((a, b) => new Date(a.nextFollowUpDate) - new Date(b.nextFollowUpDate));

    return (
        <div className="space-y-4 max-w-7xl mx-auto p-4">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white flex-shrink-0">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-slate-900">Active Follow-ups</h1>
                        <p className="text-[11px] text-slate-400">Stay on top of your schedule</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" placeholder="Find a client..."
                            className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-100 w-48"
                            value={searchQ} onChange={e => setSearchQ(e.target.value)}
                        />
                    </div>
                    <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100 gap-0.5">
                        {['all', 'today', 'pending'].map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium capitalize transition-all ${
                                    filter === f ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'
                                }`}>
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Loading ── */}
            {loading ? (
                <div className="py-16 text-center">
                    <div className="w-8 h-8 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto" />
                </div>

            /* ── Cards ── */
            ) : filteredLeads.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredLeads.map(lead => {
                        const status = getFollowUpStatus(lead.nextFollowUpDate);
                        const date = new Date(lead.nextFollowUpDate);
                        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

                        return (
                            <div key={lead._id} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-xl transition-all relative overflow-hidden group flex flex-col h-full">
                                {/* Urgency Indicator Border */}
                                {lead.nextFollowUpDate && (
                                  <div className={`absolute inset-0 border-2 rounded-2xl pointer-events-none ${
                                    new Date(lead.nextFollowUpDate) < new Date().setHours(0,0,0,0) ? 'border-red-500/20 shadow-[inset_0_0_10px_rgba(239,68,68,0.05)]' :
                                    new Date(lead.nextFollowUpDate).toDateString() === new Date().toDateString() ? 'border-amber-500/20 shadow-[inset_0_0_10px_rgba(245,158,11,0.05)]' :
                                    'border-transparent'
                                  }`} />
                                )}
                                <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                                    lead.priority === 'high' ? 'bg-red-500' :
                                    lead.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                                }`} />

                                {/* Lead info */}
                                <div className="flex items-center gap-2 pl-1 mb-1">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 border border-white flex items-center justify-center text-blue-600 text-xs font-black shadow-sm uppercase shrink-0">
                                        {(lead.name || 'L')[0]}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800 truncate">{lead.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            {lead.source || 'Manual Lead'}
                                        </p>
                                    </div>
                                    <button className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>

                                {lead.remarks && lead.remarks.length > 0 && (
                                    <p className="text-[10px] text-slate-500 italic line-clamp-1 border-l-2 border-slate-100 pl-2 mb-2">
                                        "{lead.remarks[lead.remarks.length - 1].text}"
                                    </p>
                                )}

                                {/* Timing chip */}
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${
                                    status === 'pending' ? 'bg-red-50 border-red-100 text-red-700' :
                                    status === 'today'   ? 'bg-blue-50 border-blue-100 text-blue-700' :
                                                          'bg-slate-50 border-slate-100 text-slate-500'
                                }`}>
                                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span className="font-medium">{dateStr}, {timeStr}</span>
                                    {status === 'pending' && <span className="ml-auto text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Overdue</span>}
                                    {status === 'today'   && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                                </div>

                                {/* Stage switcher */}
                                <div>
                                    <p className="text-[10px] text-slate-400 mb-1.5 pl-0.5">Progress</p>
                                    <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-100 gap-0.5">
                                        {STAGES.map(s => {
                                            const isActive = lead.status === s;
                                            const isPast = STAGES.indexOf(lead.status) > STAGES.indexOf(s);
                                            const Icon = STAGE_CONFIG[s].icon;
                                            return (
                                                <button key={s} onClick={() => handleStageUpdate(lead._id, s)}
                                                    title={`Move to ${s}`}
                                                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all relative text-[9px] font-medium ${
                                                        isActive ? 'bg-white text-blue-600 shadow-sm border border-slate-100' :
                                                        isPast   ? 'text-slate-400 hover:text-slate-600' : 'text-slate-300 hover:text-slate-400'
                                                    }`}>
                                                    <Icon className="w-3 h-3" />
                                                    <span>{STAGE_CONFIG[s].label}</span>
                                                    {isActive && (
                                                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-600 rounded-full border border-white flex items-center justify-center">
                                                            <Check className="w-1.5 h-1.5 text-white" />
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Note */}
                                {lead.followUpNote && (
                                    <p className="text-[11px] text-slate-400 italic bg-slate-50 rounded-xl px-3 py-2 line-clamp-2">
                                        "{lead.followUpNote}"
                                    </p>
                                )}

                                {/* Footer */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-50 mt-auto">
                                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors">
                                        <Phone className="w-3 h-3" /> Call now
                                    </button>
                                    <button 
                                        onClick={() => { setRescheduleData({ leadId: lead._id, date: '', time: '', note: '' }); setShowRescheduleModal(true); }}
                                        className="flex items-center gap-1 px-1.5 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-[7px] font-black uppercase tracking-tighter shadow-sm ml-auto"
                                    >
                                        <Plus className="w-2 h-2" />
                                        Set Follow-up
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

            /* ── Empty ── */
            ) : (
                <div className="py-20 text-center bg-white rounded-2xl border border-slate-100">
                    <CheckCircle2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-800">Everything is up to date</h3>
                    <p className="text-xs text-slate-400 mt-1">Scheduled leads will appear here when their follow-up is due.</p>
                </div>
            )}

            {/* ── Reschedule Modal ── */}
            {showRescheduleModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <h2 className="text-sm font-semibold text-slate-800">Reschedule call</h2>
                            </div>
                            <button onClick={() => setShowRescheduleModal(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                        </div>
                        <form onSubmit={handleReschedule} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-1">New date</label>
                                    <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-100" value={rescheduleData.date} onChange={e => setRescheduleData({...rescheduleData, date: e.target.value})} required />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-500 mb-1">New time</label>
                                    <input type="time" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-blue-100" value={rescheduleData.time} onChange={e => setRescheduleData({...rescheduleData, time: e.target.value})} required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">Reason / note</label>
                                <textarea className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none min-h-[80px] resize-none" placeholder="Why are we rescheduling?" value={rescheduleData.note} onChange={e => setRescheduleData({...rescheduleData, note: e.target.value})} />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowRescheduleModal(false)} className="flex-1 py-2.5 text-xs text-slate-400 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors">Reschedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Regression Modal ── */}
            {showRegressionModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-100">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500" />
                                <h2 className="text-sm font-semibold text-red-600">Stage regression</h2>
                            </div>
                            <button onClick={() => setShowRegressionModal(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                        </div>
                        <form onSubmit={handleRegressionSubmit} className="p-6 space-y-4">
                            <p className="text-xs text-slate-500">Moving back from <span className="text-red-500 font-medium">{regressionData.fromStatus}</span> → <span className="text-blue-600 font-medium">{regressionData.toStatus}</span></p>
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">Reason required</label>
                                <textarea className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none min-h-[80px] resize-none" placeholder="Why are you moving back?" value={regressionData.reason} onChange={e => setRegressionData({...regressionData, reason: e.target.value})} required />
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowRegressionModal(false)} className="flex-1 py-2.5 text-xs text-slate-400 hover:bg-slate-50 rounded-xl transition-all">Cancel</button>
                                <button type="submit" className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-xs font-medium hover:bg-red-600 transition-colors">Confirm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <LeadDetailModal 
                isOpen={!!selectedLead}
                onClose={() => setSelectedLead(null)}
                lead={selectedLead}
                handleCall={() => toast('Starting call...')}
                handleStageChange={handleStageUpdate}
                handleConvert={() => toast.error('Convert from main board')}
                handleRemark={handleRemarkUpdate}
            />
        </div>
    );
};

export default FollowUps;