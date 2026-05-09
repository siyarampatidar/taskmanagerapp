import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { useWebRTC } from '../../hooks/useWebRTC';
import { motion, AnimatePresence } from 'framer-motion';
import VideoCallModal from '../chat/VideoCallModal';

const CallModal = () => {
    const { 
        call, 
        token,
        liveKitUrl,
        answerCall, 
        rejectCall, 
        leaveCall
    } = useWebRTC();

    if (!call.receivingCall && !call.activeCall && !call.isCalling) return null;

    return (
        <>
            <AnimatePresence>
                {/* INCOMING CALL MODAL */}
                {call.receivingCall && !call.activeCall && (
                    <motion.div 
                        initial={{ opacity: 0, y: -100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
                    >
                        <div className="bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-100">
                                    {call.callerName ? call.callerName[0] : 'C'}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">{call.callerName}</h3>
                                    <p className="text-xs font-bold text-indigo-600 animate-pulse uppercase tracking-widest">Incoming {call.type} Call...</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={rejectCall} className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm"><PhoneOff className="w-6 h-6" /></button>
                                <button onClick={answerCall} className="w-12 h-12 rounded-2xl bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-colors shadow-lg shadow-green-100"><Phone className="w-6 h-6" /></button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* OUTGOING CALL OVERLAY */}
                {call.isCalling && !call.activeCall && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white"
                    >
                        <div className="w-32 h-32 rounded-full bg-indigo-600 flex items-center justify-center text-5xl font-black mb-8 shadow-2xl animate-pulse">
                            {call.callerName ? call.callerName[0] : 'C'}
                        </div>
                        <h2 className="text-3xl font-black mb-2">{call.callerName}</h2>
                        <p className="text-sm font-bold text-indigo-400 uppercase tracking-[0.2em] mb-12">Calling...</p>
                        <button onClick={leaveCall} className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 transition-all hover:scale-110 shadow-xl shadow-red-900/20"><PhoneOff className="w-8 h-8" /></button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ACTIVE CALL MODAL (LiveKit) */}
            {call.activeCall && token && (
                <VideoCallModal 
                    call={call}
                    token={token} 
                    url={liveKitUrl} 
                    onLeave={leaveCall} 
                />
            )}

        </>
    );
};

export default CallModal;
