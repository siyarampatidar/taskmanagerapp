import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PhoneOff, User, PhoneCall } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { endCall } from '../../Services/twilioVoiceService';

const TwilioCallModal = () => {
    const { status, currentCall } = useSelector(state => state.twilio);
    const [callDuration, setCallDuration] = useState(0);

    useEffect(() => {
        let timer;
        if (status === 'connected') {
            timer = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            setCallDuration(0);
        }
        return () => clearInterval(timer);
    }, [status]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (status === 'idle') return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="fixed bottom-6 right-6 z-[10002] w-72"
            >
                <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-6 border border-slate-700 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mb-4">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-bold">{currentCall?.name || 'Lead'}</h3>
                    <p className="text-xs text-slate-400 mb-4">{currentCall?.number}</p>
                    
                    <div className="flex flex-col items-center mb-6">
                        {status === 'connecting' && (
                            <p className="text-blue-400 text-xs font-bold uppercase animate-pulse">Connecting...</p>
                        )}
                        {status === 'ringing' && (
                            <p className="text-amber-400 text-xs font-bold uppercase animate-bounce">Ringing...</p>
                        )}
                        {status === 'connected' && (
                            <p className="text-green-500 text-sm font-bold">{formatDuration(callDuration)}</p>
                        )}
                        {status === 'ended' && (
                            <p className="text-red-400 text-xs font-bold uppercase">Call Ended</p>
                        )}
                    </div>

                    <button 
                        onClick={endCall}
                        className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20"
                    >
                        <PhoneOff className="w-6 h-6" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TwilioCallModal;
