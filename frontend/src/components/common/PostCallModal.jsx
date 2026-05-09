import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, ClipboardList, CheckCircle2 } from 'lucide-react';
import { finalizeCall } from '../../redux/slices/twilioSlice';
import { apiConnector } from '../../Services/apiConnector';
import { crmEndpoints } from '../../Services/apis';
import { toast } from 'react-hot-toast';

const DISPOSITION_OPTIONS = [
    { value: 'contacted', label: 'Interested' },
    { value: 'not-interested', label: 'Not Interested' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'lost', label: 'Lost Lead' },
    { value: 'callback', label: 'Call Back Later' },
    { value: 'wrong-number', label: 'Wrong Number' },
];

const PostCallModal = () => {
    const dispatch = useDispatch();
    const { showPostCallModal, currentCall } = useSelector(state => state.twilio);
    
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        status: 'contacted',
        remark: '',
        nextFollowUpDate: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentCall?.id) return;
        
        setLoading(true);
        try {
            const res = await apiConnector(
                'POST', 
                crmEndpoints.SUBMIT_POST_CALL_API(currentCall.id), 
                form
            );
            if (res.data.success) {
                toast.success('Call feedback saved!');
                dispatch(finalizeCall());
            }
        } catch (error) {
            toast.error('Failed to save feedback');
        } finally {
            setLoading(false);
        }
    };

    if (!showPostCallModal) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10005] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
                >
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Call Summary</h2>
                        </div>
                        <button 
                            onClick={() => dispatch(finalizeCall())}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="text-center mb-4">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Talked To</p>
                            <h3 className="text-lg font-black text-slate-900">{currentCall?.name}</h3>
                            <p className="text-[10px] text-slate-400 font-mono tracking-tighter">{currentCall?.number}</p>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Call Disposition</label>
                            <select 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                value={form.status}
                                onChange={e => setForm({...form, status: e.target.value})}
                            >
                                {DISPOSITION_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Call Remarks</label>
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none min-h-[100px]"
                                placeholder="What did you discuss? e.g. Wants a demo next week..."
                                value={form.remark}
                                onChange={e => setForm({...form, remark: e.target.value})}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Next Follow-up (Optional)</label>
                            <div className="relative">
                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="date"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                                    value={form.nextFollowUpDate}
                                    onChange={e => setForm({...form, nextFollowUpDate: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button 
                                type="button"
                                onClick={() => dispatch(finalizeCall())}
                                className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                skip
                            </button>
                            <button 
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest py-3 rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Save Feedback'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PostCallModal;
