import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import { Bell, Clock, Phone, X } from 'lucide-react';
import { fetchLeads } from '../../redux/slices/crmSlice';

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

const FollowUpReminder = () => {
    const dispatch = useDispatch();
    const { leads } = useSelector(state => state.crm);
    const [notifiedIds, setNotifiedIds] = useState(new Set());
    const audioRef = useRef(new Audio(NOTIFICATION_SOUND));

    useEffect(() => {
        // Initial fetch
        dispatch(fetchLeads());

        // Check every 1 minute
        const interval = setInterval(() => {
            dispatch(fetchLeads());
        }, 60000);

        return () => clearInterval(interval);
    }, [dispatch]);

    useEffect(() => {
        const checkFollowUps = () => {
            const now = new Date();
            
            leads.forEach(lead => {
                if (!lead.nextFollowUpDate || lead.status === 'converted' || lead.status === 'lost') return;
                
                const followUpTime = new Date(lead.nextFollowUpDate);
                const diffInMinutes = (followUpTime - now) / (1000 * 60);

                // If follow-up is due now (within 1 minute) and not already notified
                if (diffInMinutes <= 0 && diffInMinutes > -5 && !notifiedIds.has(lead._id)) {
                    showReminder(lead);
                    setNotifiedIds(prev => new Set(prev).add(lead._id));
                }
            });
        };

        checkFollowUps();
    }, [leads, notifiedIds]);

    const showReminder = (lead) => {
        // Play Sound
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));

        // Show Toast
        toast.custom((t) => (
            <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-l-4 border-blue-600`}>
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                        <div className="flex-shrink-0 pt-0.5">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                <Clock className="w-5 h-5 animate-pulse" />
                            </div>
                        </div>
                        <div className="ml-3 flex-1">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">⏰ Follow-up Due</p>
                            <p className="text-sm font-black text-slate-900 mt-0.5">
                                Call {lead.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium mt-1 line-clamp-1 italic">
                                "{lead.followUpNote || 'Scheduled follow-up'}"
                            </p>
                            <div className="flex gap-2 mt-3">
                                <button 
                                    onClick={() => {
                                        toast.dismiss(t.id);
                                        window.location.href = `/dashboard/crm?tab=leads`;
                                    }}
                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-blue-100"
                                >
                                    Open Lead
                                </button>
                                <button 
                                    onClick={() => toast.dismiss(t.id)}
                                    className="bg-slate-50 text-slate-400 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest"
                                >
                                    Later
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex border-l border-slate-50">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="w-full border border-transparent rounded-none rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        ), { duration: 10000 });
    };

    return null; // This component doesn't render anything itself
};

export default FollowUpReminder;
