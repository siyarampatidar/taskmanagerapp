import React from 'react';
import { AlertTriangle, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExpiryAlertModal = ({ daysRemaining, onClose }) => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shadow-sm">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                            Your Subscription is Expiring Soon!
                        </h2>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed">
                            Your current plan will expire in <span className="text-red-600 underline underline-offset-4">{daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}</span>. Renew now to maintain access to your workspace and data.
                        </p>
                    </div>

                    <div className="mt-8 space-y-3">
                        <button 
                            onClick={() => {
                                navigate('/select-plan');
                                onClose();
                            }}
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3 group"
                        >
                            Renew Subscription Now
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-4 bg-white text-slate-400 hover:text-slate-600 font-black text-[10px] uppercase tracking-widest transition-colors"
                        >
                            Remind Me Later
                        </button>
                    </div>
                </div>
                
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        Manual renewals take up to 2 minutes to reflect.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ExpiryAlertModal;
