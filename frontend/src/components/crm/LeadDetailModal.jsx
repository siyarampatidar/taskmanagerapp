import React from 'react';
import { 
    X, Phone, Mail, Building2, Star, TrendingUp, Activity, 
    Calendar, CheckCircle2, MessageSquare, XCircle, Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LeadDetailModal = ({ isOpen, onClose, lead, handleCall, handleStageChange, handleConvert, handleRemark, handleEdit }) => {
    const [remark, setRemark] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState('activity'); // 'activity' or 'remarks'

    if (!lead) return null;

    const STAGES = ['new', 'contacted', 'qualified', 'converted'];
    const currentIdx = STAGES.indexOf(lead.status === 'lost' ? 'qualified' : lead.status);

    const getLogConfig = (note) => {
        const text = note.toLowerCase();
        if (text.includes('call')) return { icon: Phone, color: 'bg-blue-50 text-blue-700' };
        if (text.includes('remark') || text.includes('note')) return { icon: MessageSquare, color: 'bg-amber-50 text-amber-700' };
        if (text.includes('status') || text.includes('converted') || text.includes('stage')) return { icon: CheckCircle2, color: 'bg-green-50 text-green-700' };
        if (text.includes('schedule') || text.includes('follow-up')) return { icon: Calendar, color: 'bg-violet-50 text-violet-700' };
        return { icon: Activity, color: 'bg-slate-100 text-slate-500' };
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
                    />
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 12 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[88vh] border border-slate-100"
                    >
                        {/* Status top bar */}
                        <div className={`h-0.5 w-full ${
                            lead.status === 'lost' ? 'bg-red-500' : 
                            lead.status === 'converted' ? 'bg-green-500' : 'bg-blue-600'
                        }`} />

                        <div className="flex flex-col md:flex-row overflow-hidden flex-1">

                            {/* ── LEFT PANEL ── */}
                            <div className="flex-1 p-6 flex flex-col gap-5 overflow-y-auto min-w-0 border-r border-slate-100">

                                {/* Header */}
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold flex items-center justify-center flex-shrink-0">
                                        {lead.name[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h2 className="text-base font-semibold text-slate-900 leading-tight">{lead.name}</h2>
                                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                            <Building2 className="w-3 h-3 flex-shrink-0" />
                                            {lead.company || 'Private individual'}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={onClose}
                                        className="w-7 h-7 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-white transition-all flex-shrink-0"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-2">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border ${
                                        lead.priority === 'high' ? 'bg-red-50 text-red-700 border-red-100' :
                                        lead.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        'bg-green-50 text-green-700 border-green-100'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${
                                            lead.priority === 'high' ? 'bg-red-500' :
                                            lead.priority === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                                        }`} />
                                        {lead.priority} priority
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                                        <Star className="w-3 h-3" /> {lead.source || 'Manual'}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] bg-violet-50 text-violet-700 border border-violet-100">
                                        <TrendingUp className="w-3 h-3" /> ₹{(lead.dealValue || 0).toLocaleString()}
                                    </span>
                                </div>

                                {/* Stage Progress */}
                                <div>
                                    <p className="text-[11px] text-slate-400 mb-3 flex items-center gap-1.5">
                                        <Activity className="w-3 h-3" /> Lead stage
                                    </p>
                                    <div className="relative flex items-start justify-between px-1">
                                        {/* Track lines */}
                                        <div className="absolute top-3.5 left-3.5 right-3.5 h-px bg-slate-200" />
                                        <div 
                                            className="absolute top-3.5 left-3.5 h-px bg-blue-600 transition-all duration-500"
                                            style={{ width: `${(currentIdx / (STAGES.length - 1)) * 100}%` }}
                                        />
                                        {STAGES.map((s, idx) => {
                                            const isDone = idx <= currentIdx;
                                            return (
                                                <div 
                                                    key={s}
                                                    onClick={() => {
                                                        if (s === 'converted') {
                                                            handleConvert(lead);
                                                        } else {
                                                            handleStageChange(lead._id, s);
                                                        }
                                                    }}
                                                    className="relative flex flex-col items-center gap-2 cursor-pointer group z-10"
                                                >
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border transition-all ${
                                                        isDone 
                                                            ? 'bg-blue-600 border-blue-600 text-white' 
                                                            : 'bg-white border-slate-200 text-slate-400 group-hover:border-blue-300 group-hover:text-blue-400'
                                                    }`}>
                                                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                                                    </div>
                                                    <span className={`text-[10px] whitespace-nowrap ${isDone ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>
                                                        {s === 'converted' ? 'Won' : s}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Fields */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-1.5">
                                            <Phone className="w-3 h-3" /> Phone
                                        </p>
                                        <p className="text-xs font-medium text-slate-700">{lead.contact || 'N/A'}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mb-1.5">
                                            <Mail className="w-3 h-3" /> Email
                                        </p>
                                        <p className="text-xs font-medium text-slate-700 truncate">{lead.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* ── RIGHT PANEL ── */}
                            <div className="w-full md:w-52 bg-slate-50/60 p-4 flex flex-col gap-4 overflow-hidden">

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    <button 
                                        onClick={() => handleEdit(lead)}
                                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-white border border-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-sm"
                                    >
                                        <Edit2 className="w-3 h-3" /> Edit Details
                                    </button>
                                    <button 
                                        onClick={() => handleCall(lead)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-700 text-green-50 rounded-xl text-xs font-medium hover:bg-green-800 transition-colors"
                                    >
                                        <Phone className="w-3.5 h-3.5" /> Start call
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => handleStageChange(lead._id, 'lost')}
                                            className="flex flex-col items-center justify-center gap-1 py-2.5 bg-white border border-red-100 text-red-600 rounded-xl text-[11px] font-medium hover:bg-red-50 transition-colors"
                                        >
                                            <XCircle className="w-3.5 h-3.5" /> Lost
                                        </button>
                                        <button 
                                            onClick={() => handleConvert(lead)}
                                            className="flex flex-col items-center justify-center gap-1 py-2.5 bg-blue-600 text-white rounded-xl text-[11px] font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            <CheckCircle2 className="w-3.5 h-3.5" /> Won
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Quick Remark Input */}
                                <div className="space-y-2">
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5 px-1">
                                        <MessageSquare className="w-3 h-3" /> Add remark
                                    </p>
                                    <div className="relative">
                                        <textarea 
                                            value={remark}
                                            onChange={(e) => setRemark(e.target.value)}
                                            placeholder="Type a note..."
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition-all resize-none min-h-[60px]"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    if (remark.trim()) {
                                                        setIsSubmitting(true);
                                                        handleRemark(lead._id, remark).then(() => {
                                                            setRemark('');
                                                            setIsSubmitting(false);
                                                        });
                                                    }
                                                }
                                            }}
                                        />
                                        <button 
                                            disabled={!remark.trim() || isSubmitting}
                                            onClick={() => {
                                                setIsSubmitting(true);
                                                handleRemark(lead._id, remark).then(() => {
                                                    setRemark('');
                                                    setIsSubmitting(false);
                                                });
                                            }}
                                            className="absolute bottom-2 right-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-200 transition-colors shadow-sm"
                                        >
                                            <Activity className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Tabs for Activity vs Remarks */}
                                <div className="flex items-center gap-1 border-b border-slate-100 mb-4 px-1">
                                    <button 
                                        onClick={() => setActiveTab('activity')}
                                        className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'activity' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Activity Log
                                        {activeTab === 'activity' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('remarks')}
                                        className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'remarks' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Client Remarks ({lead.remarks?.length || 0})
                                        {activeTab === 'remarks' && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />}
                                    </button>
                                </div>

                                {/* Activity timeline / Remarks List */}
                                <div className="flex flex-col flex-1 overflow-hidden">
                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                                        {activeTab === 'activity' ? (
                                            lead.activityLog && lead.activityLog.length > 0 ? (
                                                lead.activityLog.slice().reverse().map((log, idx) => {
                                                    const config = getLogConfig(log.note);
                                                    const Icon = config.icon;
                                                    return (
                                                        <div key={idx} className="flex gap-3 group">
                                                            <div className="flex flex-col items-center">
                                                                <div className={`w-7 h-7 rounded-lg ${config.color} flex items-center justify-center shadow-sm shrink-0`}>
                                                                    <Icon className="w-3.5 h-3.5" />
                                                                </div>
                                                                {idx !== lead.activityLog.length - 1 && (
                                                                    <div className="w-0.5 flex-1 bg-slate-100 my-1 group-hover:bg-slate-200 transition-colors" />
                                                                )}
                                                            </div>
                                                            <div className="pb-4">
                                                                <p className="text-[11px] font-medium text-slate-700 leading-relaxed">{log.note}</p>
                                                                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                                                                    {new Date(log.timestamp).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                                                    <Activity className="w-8 h-8 mb-2 opacity-20" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No activity yet</p>
                                                </div>
                                            )
                                        ) : (
                                            lead.remarks && lead.remarks.length > 0 ? (
                                                lead.remarks.slice().reverse().map((remark, idx) => (
                                                    <div key={idx} className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 hover:border-blue-100 transition-all">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center">
                                                                    <MessageSquare className="w-2.5 h-2.5 text-blue-600" />
                                                                </div>
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Remark #{lead.remarks.length - idx}</span>
                                                            </div>
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                                {new Date(remark.date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-700 font-medium leading-relaxed">{remark.text}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                                                    <MessageSquare className="w-8 h-8 mb-2 opacity-20" />
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No remarks added</p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LeadDetailModal;